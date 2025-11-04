import { useEffect } from 'react';
import React, { useCallback, useRef } from 'react';
import ReactFlow, {
  ReactFlowProvider,
  Background as ReactFlowBackground,
  BackgroundVariant,
  Controls,
  MiniMap,
  Connection,
  Node,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useDiagram } from '../../hooks/useDiagram';
import { ContextMenu } from '../ContextMenu/ContextMenu';
import { NodeEditModal } from '../NodeEditModal/NodeEditModal';
import { EdgeEditModal } from '../EdgeEditModal/EdgeEditModal';
import { CustomNode } from '../NodeTypes/CustomNode';
import { CustomEdgeWithLabel } from '../EdgeTypes/CustomEdgeWithLabel';
import { useTheme } from '@mui/material/styles';
import { Toolbar } from '../Toolbar/Toolbar';
import ArrowMarker from '../ArrowMarker/ArrowMarker';
import NodeContentModal from './NodeContentModal';
import { createGrid, addNodeToGrid, removeNodeFromGrid, isCellOccupied } from '../../utils/grid';

const nodeTypes = {
  custom: CustomNode,
};

const edgeTypes = {
  'custom-label': CustomEdgeWithLabel,
  arrow: CustomEdgeWithLabel, // Línea tipo flecha
};

const isValidConnection = (connection: Connection) => {
  // Permitir conexiones entre cualquier source y cualquier target
  return true;
};

export const DiagramCanvas: React.FC = () => {
  const theme = useTheme();
  const diagramRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = React.useState(true); // Estado para el indicador de carga
  const [grid, setGrid] = React.useState(() => createGrid(60, 60)); // Retícula de 10x10
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect, // Usar el onConnect del hook

    onEdgeDoubleClick,
    onPaneContextMenu,
    onNodeContextMenu,
    onEdgeContextMenu,
    setReactFlowInstance,
    reactFlowInstance,
    contextMenu,
    closeContextMenu,
    createNodeFromContextMenu,
    deleteNodeFromContextMenu,
    deleteEdgeFromContextMenu,
    selectedNodeForDelete,
    selectedEdgeForDelete,
    updateNodeData,
    updateEdgeData,
    selectedNodeForEdit,
    selectedEdgeForEdit,
    isEditModalOpen,
    isEdgeEditModalOpen,
    closeEditModal,
    closeEdgeEditModal,
    importFromJson,
    toggleEdgeDirection,
    setNodes,
    setEdges,
    openEditModal,
    modalState,
    handleNodeClick,
    closeModal,
  } = useDiagram();

  useEffect(() => {
    const loadDiagram = async () => {
      try {
        // Intentar cargar el diagrama desde el backend si se especifica una URL
        const start_url = process.env.REACT_APP_START_URL;

        if (start_url) {
          const response = await fetch(start_url);
          if (!response.ok) {
            throw new Error(`Error al cargar desde el backend: ${response.statusText}`);
          }
          const json = await response.json();
          if (json.nodes && json.edges) {
            setNodes(json.nodes);
            setEdges(json.edges);
            console.log('Diagrama cargado desde el backend.');
            return; // Salir si se cargó correctamente
          } else {
            throw new Error('El JSON recibido del backend no tiene el formato esperado.');
          }
        }

        // Si no se especifica una URL, cargar el diagrama predeterminado
        console.log('No se especificó una URL. Cargando el diagrama predeterminado.');
        const fallbackResponse = await fetch('/Diagramas/MapaDeSitioLineasPR.json');
        if (!fallbackResponse.ok) {
          throw new Error(`Error al cargar el diagrama predeterminado: ${fallbackResponse.statusText}`);
        }
        const fallbackJson = await fallbackResponse.json();
        if (fallbackJson.nodes && fallbackJson.edges) {
          setNodes(fallbackJson.nodes);
          setEdges(fallbackJson.edges);
          console.log('Diagrama predeterminado cargado correctamente.');
        } else {
          throw new Error('El JSON predeterminado no tiene el formato esperado.');
        }
      } catch (error) {
        console.error('Error al cargar el diagrama:', error);
        alert('No se pudo cargar ningún diagrama.');
      }
    };

    loadDiagram();
  }, [setNodes, setEdges]);

  const onPaneClick = useCallback(() => {
    closeContextMenu();
  }, [closeContextMenu]);

  // Nueva función para alternar el tipo de línea
  const toggleEdgeType = useCallback(() => {
    if (!selectedEdgeForDelete) return;

    setEdges((prevEdges) =>
      prevEdges.map((edge) =>
        edge.id === selectedEdgeForDelete
          ? {
              ...edge,
              type: edge.type === 'default' ? 'arrow' : 'default', // Alternar entre 'default' y 'arrow'
              style: {
                stroke: '#000000', // Color negro para ambas líneas
                strokeWidth: 2, // Ancho de línea consistente
              },
              markerEnd: edge.type === 'default' ? 'url(#arrowhead)' : undefined, // Flecha solo para 'arrow'
            }
          : edge
      )
    );
    closeContextMenu();
  }, [selectedEdgeForDelete, setEdges, closeContextMenu]);

  // Función para abrir el modal de edición desde el menú contextual
  const handleEditNodeFromContextMenu = React.useCallback(() => {
    if (selectedNodeForDelete) {
      openEditModal(selectedNodeForDelete);
    }
  }, [selectedNodeForDelete, openEditModal]);

  //funcion creada para saber que nodo fue clickeado, necesaria para el modal
  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      handleNodeClick(node);
    },
    [handleNodeClick]
  );

  const handleAddNode = (node: Node, row: number, col: number) => {
    if (addNodeToGrid(grid, node, row, col)) {
      console.log(`Nodo agregado en la celda (${row}, ${col})`);
    } else {
      console.error(`La celda (${row}, ${col}) ya está ocupada.`);
    }
  };

  const handleRemoveNode = (row: number, col: number) => {
    if (removeNodeFromGrid(grid, row, col)) {
      console.log(`Nodo eliminado de la celda (${row}, ${col})`);
    } else {
      console.error(`La celda (${row}, ${col}) ya estaba vacía.`);
    }
  };

  return (
    <div ref={diagramRef} style={{ width: '100%', height: '100vh', position: 'relative' }}>
      <Toolbar
        reactFlowInstance={reactFlowInstance}
        diagramRef={diagramRef}
        onImportJson={importFromJson}
      />

      {/* Retícula: Colócala antes del componente ReactFlow */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          display: 'grid',
          gridTemplateColumns: `repeat(${grid[0].length}, 1fr)`,
          gap: '2px',
          zIndex: 1, // Asegúrate de que esté detrás de ReactFlow pero encima del fondo
          pointerEvents: 'none', // Evita que bloquee eventos
        }}
      >
        {grid.map((row, rowIndex) =>
          row.map((cell, colIndex) => (
            <div
              key={`${rowIndex}-${colIndex}`}
              style={{
                width: '50px',
                height: '50px',
                border: '1px solid rgba(0, 0, 0, 0.2)', // Borde más sutil
                backgroundColor: cell ? 'rgba(76, 175, 80, 0.5)' : 'transparent', // Fondo transparente
              }}
            />
          ))
        )}
      </div>

      {/* ReactFlow: Colócalo encima de la retícula */}
      <ReactFlowProvider>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodeClick={onNodeClick}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onEdgeDoubleClick={onEdgeDoubleClick}
          onPaneContextMenu={onPaneContextMenu}
          onNodeContextMenu={onNodeContextMenu}
          onEdgeContextMenu={onEdgeContextMenu}
          onPaneClick={onPaneClick}
          onInit={setReactFlowInstance}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          isValidConnection={isValidConnection}
          style={{
            backgroundColor: 'rgba(0, 0, 255, 0.1)', // Fondo temporal para depuración
            zIndex: 2, // Asegúrate de que esté por encima de la retícula
          }}
        >
          <ReactFlowBackground
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1}
            color={theme.palette.divider}
          />
          <ArrowMarker id="arrowhead" />
          <Controls />
          <MiniMap
            style={{
              backgroundColor: theme.palette.background.paper,
            }}
          />
        </ReactFlow>
      </ReactFlowProvider>

      {/* Otros componentes */}
      <ContextMenu
        anchorPosition={contextMenu}
        onClose={closeContextMenu}
        onCreateNode={createNodeFromContextMenu}
        onDeleteNode={deleteNodeFromContextMenu}
        onEditNode={handleEditNodeFromContextMenu}
        onDeleteEdge={deleteEdgeFromContextMenu}
        onToggleEdgeDirection={toggleEdgeDirection}
        selectedNodeForDelete={selectedNodeForDelete}
        selectedEdgeForDelete={selectedEdgeForDelete}
        onToggleEdgeType={toggleEdgeType}
      />

      <NodeEditModal
        open={isEditModalOpen}
        onClose={closeEditModal}
        node={selectedNodeForEdit}
        onSave={updateNodeData}
      />

      <EdgeEditModal
        open={isEdgeEditModalOpen}
        onClose={closeEdgeEditModal}
        edge={selectedEdgeForEdit}
        nodes={nodes}
        onSave={updateEdgeData}
      />

      <NodeContentModal
        open={modalState.open}
        onClose={closeModal}
        url={modalState.url}
        title={modalState.title}
      />
    </div>
  );
};


