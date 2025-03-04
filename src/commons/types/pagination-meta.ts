export interface PaginationMeta {
  total: number; // Total de elementos disponibles
  page: number; // Página actual
  limit: number; // Límite de elementos por página
  pages: number; // Total de páginas
  order: string; // Campo orden
  orderBy: string; // Orden asc / desc
}

export interface PaginationResponse<T> {
  meta: PaginationMeta;
  data: T[]; // Lista de elementos paginados
}
