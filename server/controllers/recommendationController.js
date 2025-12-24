const mongoose = require('mongoose');
const User = require('../models/User');
const Connection = require('../models/Connection');

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;
const DEFAULT_MUTUAL_PREVIEW_LIMIT = 3;
const MAX_MUTUAL_PREVIEW_LIMIT = 10;

function parseObjectIdList(value) {
  if (!value) return [];

  const raw = Array.isArray(value)
    ? value.flatMap((v) => String(v).split(','))
    : String(value).split(',');

  const unique = new Set();
  for (const part of raw) {
    const trimmed = String(part).trim();
    if (!trimmed) continue;
    if (!mongoose.isValidObjectId(trimmed)) continue;
    unique.add(trimmed);
  }

  return [...unique].map((id) => new mongoose.Types.ObjectId(id));
}

function buildMutualPreviewStages({ myConnectionIds, mutualPreviewLimit }) {
  return [
    {
      $addFields: {
        mutualIds: { $setIntersection: ['$connections', myConnectionIds] }
      }
    },
    {
      $addFields: {
        mutualCount: { $size: '$mutualIds' },
        mutualPreviewIds: { $slice: ['$mutualIds', mutualPreviewLimit] }
      }
    },
    {
      $lookup: {
        from: 'users',
        let: { ids: '$mutualPreviewIds' },
        pipeline: [
          { $match: { $expr: { $in: ['$_id', '$$ids'] } } },
          { $project: { _id: 1, avatarUrl: 1 } }
        ],
        as: 'mutualConnections'
      }
    },
    {
      $project: {
        password: 0,
        connections: 0,
        mutualIds: 0,
        mutualPreviewIds: 0,
        education: 0,
        experience: 0
      }
    }
  ];
}

async function getPendingConnectionUserIds(userObjectId) {
  const pending = await Connection.find({
    status: 'pending',
    $or: [{ requester: userObjectId }, { recipient: userObjectId }]
  }).select('requester recipient');

  return pending.map((c) =>
    c.requester.toString() === userObjectId.toString() ? c.recipient : c.requester
  );
}

exports.getRecommendations = async (req, res) => {
  try {
    const userObjectId = new mongoose.Types.ObjectId(req.user.id);

    const limit = Math.min(
      Math.max(parseInt(req.query.limit, 10) || DEFAULT_LIMIT, 1),
      MAX_LIMIT
    );

    const mutualPreviewLimit = Math.min(
      Math.max(parseInt(req.query.mutualPreviewLimit, 10) || DEFAULT_MUTUAL_PREVIEW_LIMIT, 0),
      MAX_MUTUAL_PREVIEW_LIMIT
    );

    const excludeFromClient = parseObjectIdList(req.query.exclude);

    const currentUser = await User.findById(userObjectId)
      .select('connections company education experience')
      .lean();

    if (!currentUser) {
      return res.status(404).json({ msg: 'User not found' });
    }

    const myConnectionIds = (currentUser.connections || []).map(
      (id) => new mongoose.Types.ObjectId(id)
    );

    const mySchools = (currentUser.education || [])
      .map((e) => e?.school)
      .filter(Boolean);

    const myCompanies = [currentUser.company, ...(currentUser.experience || []).map((e) => e?.company)]
      .filter(Boolean);

    const pendingOtherUserIds = await getPendingConnectionUserIds(userObjectId);

    const excludeSet = new Set([
      userObjectId.toString(),
      ...excludeFromClient.map((id) => id.toString()),
      ...myConnectionIds.map((id) => id.toString()),
      ...pendingOtherUserIds.map((id) => id.toString())
    ]);

    const buildMatchExclude = () => ({
      _id: {
        $nin: [...excludeSet].map((id) => new mongoose.Types.ObjectId(id))
      }
    });

    const recommendations = [];

    // 1) Mutual connections (highest priority)
    if (recommendations.length < limit && myConnectionIds.length > 0) {
      const remaining = limit - recommendations.length;

      const mutualPipeline = [
        {
          $match: {
            ...buildMatchExclude(),
            connections: { $in: myConnectionIds }
          }
        },
        { $addFields: { rand: { $rand: {} } } },
        ...buildMutualPreviewStages({ myConnectionIds, mutualPreviewLimit }),
        { $match: { mutualCount: { $gt: 0 } } },
        { $sort: { mutualCount: -1, rand: 1 } },
        { $limit: remaining }
      ];

      const mutualResults = await User.aggregate(mutualPipeline);
      for (const item of mutualResults) {
        excludeSet.add(item._id.toString());
        recommendations.push(item);
      }
    }

    // 2) Same university/college/workplace
    if (recommendations.length < limit && (mySchools.length > 0 || myCompanies.length > 0)) {
      const remaining = limit - recommendations.length;

      const sharedOr = [];
      if (myCompanies.length > 0) sharedOr.push({ company: { $in: myCompanies } });
      if (mySchools.length > 0) sharedOr.push({ 'education.school': { $in: mySchools } });

      const sharedPipeline = [
        {
          $match: {
            ...buildMatchExclude(),
            $or: sharedOr
          }
        },
        {
          $addFields: {
            rand: { $rand: {} },
            candidateSchools: {
              $map: { input: { $ifNull: ['$education', []] }, as: 'e', in: '$$e.school' }
            }
          }
        },
        {
          $addFields: {
            sharedSchoolCount: mySchools.length
              ? { $size: { $setIntersection: ['$candidateSchools', mySchools] } }
              : 0,
            sharedCompany: myCompanies.length ? { $in: ['$company', myCompanies] } : false
          }
        },
        {
          $addFields: {
            sharedScore: {
              $add: [
                { $cond: ['$sharedCompany', 1, 0] },
                { $cond: [{ $gt: ['$sharedSchoolCount', 0] }, 1, 0] }
              ]
            }
          }
        },
        ...buildMutualPreviewStages({ myConnectionIds, mutualPreviewLimit }),
        { $sort: { sharedScore: -1, rand: 1 } },
        { $limit: remaining }
      ];

      const sharedResults = await User.aggregate(sharedPipeline);
      for (const item of sharedResults) {
        excludeSet.add(item._id.toString());
        recommendations.push(item);
      }
    }

    // 3) Random fill
    if (recommendations.length < limit) {
      const remaining = limit - recommendations.length;

      const randomPipeline = [
        { $match: buildMatchExclude() },
        { $sample: { size: remaining } },
        ...buildMutualPreviewStages({ myConnectionIds, mutualPreviewLimit })
      ];

      const randomResults = await User.aggregate(randomPipeline);
      for (const item of randomResults) {
        excludeSet.add(item._id.toString());
        recommendations.push(item);
      }
    }

    res.json(recommendations);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

exports.getRecommendationsByIds = async (req, res) => {
  try {
    const userObjectId = new mongoose.Types.ObjectId(req.user.id);
    const ids = parseObjectIdList(req.query.ids).slice(0, DEFAULT_LIMIT);

    if (ids.length === 0) {
      return res.json([]);
    }

    const currentUser = await User.findById(userObjectId)
      .select('connections')
      .lean();

    if (!currentUser) {
      return res.status(404).json({ msg: 'User not found' });
    }

    const myConnectionIds = (currentUser.connections || []).map(
      (id) => new mongoose.Types.ObjectId(id)
    );

    // Preserve the incoming order.
    const pipeline = [
      { $match: { _id: { $in: ids } } },
      { $addFields: { __order: { $indexOfArray: [ids, '$_id'] } } },
      ...buildMutualPreviewStages({ myConnectionIds, mutualPreviewLimit: DEFAULT_MUTUAL_PREVIEW_LIMIT }),
      { $sort: { __order: 1 } },
      { $project: { __order: 0 } }
    ];

    const results = await User.aggregate(pipeline);
    res.json(results);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};
