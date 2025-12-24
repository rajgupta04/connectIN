import axios from './axios';

export const getRtcToken = ({ channelName, callType }) => {
  const params = new URLSearchParams();
  params.set('channelName', channelName);
  params.set('callType', callType);
  params.set('expireSeconds', '600');
  params.set('role', 'publisher');
  return axios.get(`/agora/rtc-token?${params.toString()}`);
};
