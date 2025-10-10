import apiClient from "./apiClient";

// --- Bloque Service ---
export const listBloques = async (params) => {
  const { data } = await apiClient.get("/bloques/", { params });
  return data;
}
export const createBloque = (data) => apiClient.post("/bloques/", data);
export const updateBloque = (id, data) => apiClient.patch(`/bloques/${id}/`, data);
export const deleteBloque = (id) => apiClient.delete(`/bloques/${id}/`);

// --- Modulo Service ---
export const listModulos = async (params) => {
  const { data } = await apiClient.get("/modulos/", { params });
  return data;
}
export const createModulo = (data) => apiClient.post("/modulos/", data);
export const updateModulo = (id, data) => apiClient.patch(`/modulos/${id}/`, data);
export const deleteModulo = (id) => apiClient.delete(`/modulos/${id}/`);

// --- Examen Service ---
export const listExamenes = async (params) => {
  const { data } = await apiClient.get("/examenes/", { params });
  return data;
}
export const createExamen = (data) => apiClient.post("/examenes/", data);
export const updateExamen = (id, data) => apiClient.patch(`/examenes/${id}/`, data);
export const deleteExamen = (id) => apiClient.delete(`/examenes/${id}/`);

// --- Courses Graph ---
export const getCoursesGraph = async (params) => {
  const { data } = await apiClient.get('/administracion/grafico-cursos/', { params });
  return data;
}
