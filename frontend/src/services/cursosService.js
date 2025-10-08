import apiClient from "./apiClient";

export async function listCursos(params) {
  const { data } = await apiClient.get("/programas/", { params });
  return data;
}

export async function getCurso(id) {
  const { data } = await apiClient.get(`/programas/${id}/`);
  return data;
}

export async function createCurso(payload) {
  const { data } = await apiClient.post("/programas/", payload);
  return data;
}

export async function updateCurso(id, payload) {
  const { data } = await apiClient.patch(`/programas/${id}/`, payload);
  return data;
}

export async function deleteCurso(id) {
  await apiClient.delete(`/programas/${id}/`);
}

export async function listCohortes(params) {
  const { data } = await apiClient.get("/cohortes/", { params });
  return data;
}
