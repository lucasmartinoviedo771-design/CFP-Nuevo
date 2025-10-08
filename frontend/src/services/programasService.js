import apiClient from "./apiClient";

export async function listProgramas(params) {
  const { data } = await apiClient.get("/programas/", { params });
  return data;
}

export async function createPrograma(payload) {
  const { data } = await apiClient.post("/programas/", payload);
  return data;
}

export async function updatePrograma(id, payload) {
  const { data } = await apiClient.patch(`/programas/${id}/`, payload);
  return data;
}

export async function deletePrograma(id) {
  await apiClient.delete(`/programas/${id}/`);
}
