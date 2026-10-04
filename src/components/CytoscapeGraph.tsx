import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import cytoscape, { Core } from 'cytoscape';
import CytoscapeComponent from 'react-cytoscapejs';

// High-tech stylesheet for FinTrace graph analysis
export const getCytoscapeStylesheet = (): any[] => [
    {
        selector: 'node',
        style: {
            'label': 'data(label)',
            'color': '#F5F7FA',
            'font-size': '11px',
            'font-weight': '600',
            'font-family': 'Inter, system-ui, sans-serif',
            'text-valign': 'center',
            'text-halign': 'center',
            'background-color': '#4F8CFF',
            'width': '52px',
            'height': '52px',
            'border-width': 2,
            'border-color': '#162C43',
            'cursor': 'pointer',
            'transition-property': 'background-color, border-color, border-width, opacity, width, height',
            'transition-duration': '0.2s',
        }
    },
    {
        selector: 'node[risk = "High"]',
        style: {
            'background-color': '#FF5C6C',
            'border-color': '#7F1D1D',
            'color': '#FFFFFF',
        }
    },
    {
        selector: 'node[risk = "Medium"]',
        style: {
            'background-color': '#FFB547',
            'border-color': '#78350F',
            'color': '#07111F',
        }
    },
    {
        selector: 'node[risk = "Low"]',
        style: {
            'background-color': '#35D07F',
            'border-color': '#064E3B',
            'color': '#07111F',
        }
    },
    {
        selector: 'node.selected, node:selected',
        style: {
            'border-width': 4,
            'border-color': '#36DDE0',
            'overlay-color': '#36DDE0',
            'overlay-opacity': 0.25,
            'overlay-padding': 8,
            'z-index': 9999,
        }
    },
    {
        selector: 'node.highlighted',
        style: {
            'opacity': 1,
            'border-width': 3,
            'border-color': '#36DDE0',
            'z-index': 9990,
        }
    },
    {
        selector: 'node.dimmed',
        style: {
            'opacity': 0.2,
        }
    },
    {
        selector: 'edge',
        style: {
            'width': 2.5,
            'line-color': '#4A627E',
            'target-arrow-color': '#4A627E',
            'target-arrow-shape': 'triangle',
            'arrow-scale': 1.2,
            'curve-style': 'bezier',
            'opacity': 0.7,
            'label': 'data(formattedAmount)',
            'font-size': '10px',
            'font-weight': '600',
            'font-family': 'Inter, system-ui, sans-serif',
            'color': '#9AAABD',
            'text-background-color': '#07111F',
            'text-background-opacity': 0.9,
            'text-background-padding': '3px',
            'text-background-shape': 'roundrectangle',
            'text-rotation': 'autorotate' as any,
            'text-margin-y': -8,
            'transition-property': 'line-color, target-arrow-color, width, opacity',
            'transition-duration': '0.2s',
        }
    },
    {
        selector: 'edge.highlighted',
        style: {
            'width': 3.5,
            'line-color': '#36DDE0',
            'target-arrow-color': '#36DDE0',
            'opacity': 1,
            'color': '#36DDE0',
            'text-background-color': '#0B1E33',
            'z-index': 9995,
        }
    },
    {
        selector: 'edge.dimmed',
        style: {
            'opacity': 0.15,
        }
    },
    {
        selector: ':selected',
        style: {
            'border-width': 4,
            'border-color': '#36DDE0',
            'line-color': '#36DDE0',
            'target-arrow-color': '#36DDE0',
            'opacity': 1
        }
    }
];

export interface CytoscapeGraphRef {
    zoomIn: () => void;
    zoomOut: () => void;
    fit: () => void;
    resetLayout: (newLayout?: string) => void;
    centerNode: (nodeId: string) => void;
    selectNode: (nodeId: string) => void;
    getCy: () => Core | null;
}

interface CytoscapeGraphProps {
    elements: cytoscape.ElementDefinition[];
    onNodeClick?: (nodeId: string) => void;
    onBackgroundClick?: () => void;
    selectedNodeId?: string | null;
    height?: string;
    layoutName?: string;
}

const CytoscapeGraph = forwardRef<CytoscapeGraphRef, CytoscapeGraphProps>(function CytoscapeGraph(
    {
        elements,
        onNodeClick,
        onBackgroundClick,
        selectedNodeId,
        height = '100%',
        layoutName = 'cose'
    },
    ref
) {
    const cyRef = useRef<Core | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const prevElementsKeyRef = useRef<string>('');

    // Keep callback refs fresh without triggering useEffect re-runs
    const onNodeClickRef = useRef(onNodeClick);
    onNodeClickRef.current = onNodeClick;

    const onBackgroundClickRef = useRef(onBackgroundClick);
    onBackgroundClickRef.current = onBackgroundClick;

    // Expose imperative API for toolbar controls
    useImperativeHandle(ref, () => ({
        zoomIn: () => {
            const cy = cyRef.current;
            if (!cy) return;
            cy.zoom({
                level: cy.zoom() * 1.25,
                renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 }
            });
        },
        zoomOut: () => {
            const cy = cyRef.current;
            if (!cy) return;
            cy.zoom({
                level: cy.zoom() * 0.8,
                renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 }
            });
        },
        fit: () => {
            const cy = cyRef.current;
            if (!cy) return;
            cy.fit(undefined, 40);
        },
        resetLayout: (customLayout?: string) => {
            const cy = cyRef.current;
            if (!cy) return;
            const targetLayout = customLayout || layoutName;
            const layout = cy.layout({
                name: targetLayout,
                animate: true,
                animationDuration: 500,
                padding: 40,
                nodeRepulsion: () => 5000,
                idealEdgeLength: () => 120,
                edgeElasticity: () => 100,
                gravity: 80,
                numIter: 1000,
            } as any);
            layout.run();
        },
        centerNode: (nodeId: string) => {
            const cy = cyRef.current;
            if (!cy) return;
            const targetNode = cy.$(`node#${nodeId}`);
            if (targetNode.length > 0) {
                cy.animate({
                    center: { eles: targetNode },
                    zoom: Math.max(cy.zoom(), 1.2),
                    duration: 350
                });
            }
        },
        selectNode: (nodeId: string) => {
            const cy = cyRef.current;
            if (!cy) return;
            const targetNode = cy.$(`node#${nodeId}`);
            if (targetNode.length > 0) {
                targetNode.select();
            }
        },
        getCy: () => cyRef.current
    }));

    // ResizeObserver to resize and fit Cytoscape when container dimensions change
    useEffect(() => {
        if (!containerRef.current) return;
        const observer = new ResizeObserver(() => {
            const cy = cyRef.current;
            if (cy) {
                cy.resize();
                cy.fit(undefined, 40);
            }
        });
        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    // Register event listeners once cy instance is ready
    const handleCyInit = (cy: Core) => {
        cyRef.current = cy;

        // Ensure canvas dimensions and fit layout properly after DOM paint
        requestAnimationFrame(() => {
            cy.resize();
            cy.fit(undefined, 40);
        });

        // Node click handler
        cy.on('tap', 'node', (evt) => {
            const node = evt.target;
            const id = node.id();
            if (onNodeClickRef.current) {
                onNodeClickRef.current(id);
            }
        });

        // Background canvas click handler
        cy.on('tap', (evt) => {
            if (evt.target === cy) {
                if (onBackgroundClickRef.current) {
                    onBackgroundClickRef.current();
                }
            }
        });
    };

    // Run layout ONLY when the elements set or layoutName changes, NEVER on node clicks!
    const elementsKey = elements.map(e => e.data.id).sort().join('|');

    useEffect(() => {
        const cy = cyRef.current;
        if (!cy) return;

        if (prevElementsKeyRef.current !== elementsKey) {
            prevElementsKeyRef.current = elementsKey;
            const layout = cy.layout({
                name: layoutName,
                animate: true,
                animationDuration: 500,
                padding: 40,
                nodeRepulsion: () => 5000,
                idealEdgeLength: () => 120,
                edgeElasticity: () => 100,
                gravity: 80,
                numIter: 1000,
            } as any);
            layout.run();
        }
    }, [elementsKey, layoutName]);

    // Handle node selection & visual network focus / dimming
    useEffect(() => {
        const cy = cyRef.current;
        if (!cy) return;

        if (selectedNodeId) {
            const targetNode = cy.$(`node#${selectedNodeId}`);
            if (targetNode.length > 0) {
                // Clear previous classes
                cy.elements().removeClass('highlighted dimmed selected');

                // Dim all
                cy.elements().addClass('dimmed');

                // Find connected edges and neighbors
                const connectedEdges = targetNode.connectedEdges();
                const connectedNodes = connectedEdges.connectedNodes();

                // Highlight selected node, neighbors, and direct edges
                targetNode.removeClass('dimmed').addClass('selected');
                connectedNodes.removeClass('dimmed').addClass('highlighted');
                connectedEdges.removeClass('dimmed').addClass('highlighted');

                // Smoothly focus on selected node
                cy.animate({
                    center: { eles: targetNode },
                    duration: 300
                });
            }
        } else {
            // Restore all elements to normal view
            cy.elements().removeClass('highlighted dimmed selected');
        }
    }, [selectedNodeId]);

    return (
        <div ref={containerRef} className="w-full h-full min-h-[440px] relative">
            <CytoscapeComponent
                elements={elements}
                style={{ width: '100%', height }}
                stylesheet={getCytoscapeStylesheet()}
                cy={handleCyInit}
                layout={{ name: layoutName }}
                wheelSensitivity={0.2}
            />
        </div>
    );
});

export default CytoscapeGraph;
