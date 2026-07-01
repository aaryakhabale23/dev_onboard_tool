import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({ baseURL: API });

export const listRepos = () => api.get("/repos").then((r) => r.data);
export const getRepo = (id) => api.get(`/repos/${id}`).then((r) => r.data);
export const deleteRepo = (id) => api.delete(`/repos/${id}`).then((r) => r.data);

export const importZip = (file, name) => {
  const fd = new FormData();
  fd.append("file", file);
  if (name) fd.append("name", name);
  return api
    .post("/repos/upload", fd, { headers: { "Content-Type": "multipart/form-data" } })
    .then((r) => r.data);
};

export const importLocal = (path, name) =>
  api.post("/repos/local", { path, name }).then((r) => r.data);

export const importGithub = (url, name) =>
  api.post("/repos/github", { url, name }).then((r) => r.data);

export const getTree = (id) => api.get(`/repos/${id}/tree`).then((r) => r.data);
export const getFile = (id, path) =>
  api.get(`/repos/${id}/file`, { params: { path } }).then((r) => r.data);
export const getDependencies = (id) => api.get(`/repos/${id}/dependencies`).then((r) => r.data);
export const getEndpoints = (id) => api.get(`/repos/${id}/endpoints`).then((r) => r.data);
export const getModels = (id) => api.get(`/repos/${id}/models`).then((r) => r.data);
export const getComponents = (id) => api.get(`/repos/${id}/components`).then((r) => r.data);
export const getOverview = (id) => api.get(`/repos/${id}/overview`).then((r) => r.data);
export const getGitDiff = (id) => api.get(`/repos/${id}/git-diff`).then((r) => r.data);
export const searchRepo = (id, q) =>
  api.get(`/repos/${id}/search`, { params: { q } }).then((r) => r.data);

export const listAnnotations = (id, filePath) =>
  api
    .get(`/repos/${id}/annotations`, { params: filePath ? { file_path: filePath } : {} })
    .then((r) => r.data);
export const createAnnotation = (id, payload) =>
  api.post(`/repos/${id}/annotations`, payload).then((r) => r.data);
export const deleteAnnotation = (id, annId) =>
  api.delete(`/repos/${id}/annotations/${annId}`).then((r) => r.data);
