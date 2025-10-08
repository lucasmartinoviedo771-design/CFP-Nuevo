import apiClient from "./apiClient";

export async function listEstudiantes(params) {
  const { data } = await apiClient.get("/estudiantes/", { params });
  return data;
}

export async function createEstudiante(payload) {
  try {
    const { data } = await apiClient.post("/estudiantes/", payload);
    return data;
  } catch (err) {
    console.error("POST /estudiantes/ payload:", payload);
    if (err.response) {
      console.error("POST /estudiantes/ error:", err.response.status, err.response.data);
      throw err.response.data;
    }
    throw err;
  }
}

export async function updateEstudiante(id, payload) {
  const { data } = await apiClient.patch(`/estudiantes/${id}/`, payload);
  return data;
}

export async function deleteEstudiante(id) {
  await apiClient.delete(`/estudiantes/${id}/`);
}
