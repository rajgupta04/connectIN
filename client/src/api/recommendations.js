import api from './axios';

export const getRecommendations = ({ limit = 10, exclude = [], mutualPreviewLimit = 3 } = {}) => {
  const excludeParam = Array.isArray(exclude) && exclude.length > 0 ? exclude.join(',') : undefined;

  return api.get('/recommendations', {
    params: {
      limit,
      mutualPreviewLimit,
      ...(excludeParam ? { exclude: excludeParam } : {})
    }
  });
};

export const getRecommendationsByIds = ({ ids = [] } = {}) => {
  const idsParam = Array.isArray(ids) && ids.length > 0 ? ids.join(',') : undefined;

  return api.get('/recommendations/by-ids', {
    params: {
      ...(idsParam ? { ids: idsParam } : {})
    }
  });
};
