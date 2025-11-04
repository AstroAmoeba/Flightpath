import { Node } from 'reactflow';

// Define el tipo de celda: puede contener un nodo o estar vacía (null)
type GridCell = Node | null;

// Define la retícula como una matriz bidimensional
type Grid = GridCell[][];

// Función para crear una retícula vacía
export const createGrid = (rows: number, cols: number): Grid => {
  return Array.from({ length: rows }, () => Array(cols).fill(null));
};

// Función para agregar un nodo a la retícula
export const addNodeToGrid = (grid: Grid, node: Node, row: number, col: number): boolean => {
  if (grid[row][col] === null) {
    grid[row][col] = node;
    return true; // Nodo agregado exitosamente
  }
  return false; // La celda ya está ocupada
};

// Función para eliminar un nodo de la retícula
export const removeNodeFromGrid = (grid: Grid, row: number, col: number): boolean => {
  if (grid[row][col] !== null) {
    grid[row][col] = null;
    return true; // Nodo eliminado exitosamente
  }
  return false; // La celda ya estaba vacía
};

// Función para verificar si una celda está ocupada
export const isCellOccupied = (grid: Grid, row: number, col: number): boolean => {
  return grid[row][col] !== null;
};