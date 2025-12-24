const { RtcTokenBuilder, RtcRole } = require('agora-access-token');

const parsePositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

exports.getRtcToken = async (req, res) => {
  try {
    const appId = process.env.AGORA_APP_ID;
    const appCertificate = process.env.AGORA_APP_CERTIFICATE;

    if (!appId || !appCertificate) {
      return res.status(500).json({
        msg: 'Agora is not configured. Set AGORA_APP_ID and AGORA_APP_CERTIFICATE on the server.'
      });
    }

    const channelName = String(req.query.channelName || '').trim();
    const callType = String(req.query.callType || 'video');

    if (!channelName) {
      return res.status(400).json({ msg: 'channelName is required' });
    }

    const expireSeconds = parsePositiveInt(req.query.expireSeconds, 60 * 10);
    const role = String(req.query.role || 'publisher');
    const rtcRole = role === 'subscriber' ? RtcRole.SUBSCRIBER : RtcRole.PUBLISHER;

    // Use Mongo user id as Agora userAccount (string), so we don't need numeric uid mapping.
    const userAccount = String(req.user.id);
    const now = Math.floor(Date.now() / 1000);
    const privilegeExpireTs = now + expireSeconds;

    const token = RtcTokenBuilder.buildTokenWithUserAccount(
      appId,
      appCertificate,
      channelName,
      userAccount,
      rtcRole,
      privilegeExpireTs
    );

    return res.json({
      appId,
      token,
      channelName,
      userAccount,
      callType
    });
  } catch (err) {
    console.error(err);
    return res.status(500).send('Server Error');
  }
};
