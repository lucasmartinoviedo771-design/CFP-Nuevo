import apiClient from "./apiClient";

export async function listAsistencias(params) {
  const { data } = await apiClient.get("/asistencias/", { params });
  return data;
}
export async function createAsistencia(payload) {
  const { data } = await apiClient.post("/asistencias/", payload);
  return data;
}
export async function updateAsistencia(id, payload) {
  const { data } = await apiClient.patch(`/asistencias/${id}/`, payload);
  return data;
}
export async function deleteAsistencia(id) {
  await apiClient.delete(`/asistencias/${id}/`);
}
