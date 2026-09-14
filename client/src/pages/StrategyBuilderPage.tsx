import { useCallback, useMemo, useState } from 'react'
import {
	addEdge,
	Background,
	Controls,
	MiniMap,
	ReactFlow,
	useEdgesState,
	useNodesState,
	type Connection,
	type Edge,
	type Node,
} from '@xyflow/react'
import {
	createRsiTemplate,
	validateStrategy,
	type StrategyGraph,
} from '@borsaty/strategies'

const template = createRsiTemplate()
const labels = new Map(
	template.nodes.map((node) => [node.id, node.label ?? node.type]),
)
const initialNodes: Node[] = template.nodes.map((node, index) => ({
	id: node.id,
	position: { x: (index % 3) * 230, y: Math.floor(index / 3) * 150 },
	data: { label: labels.get(node.id) },
	type: 'default',
}))
const initialEdges: Edge[] = template.edges.map((edge) => ({
	id: edge.id,
	source: edge.source,
	target: edge.target,
	animated: false,
}))

const graphFromFlow = (nodes: Node[], edges: Edge[]): StrategyGraph => {
	return {
		...template,
		nodes: nodes.map((node) => ({
			id: node.id,
			type:
				template.nodes.find((item) => item.id === node.id)?.type ?? 'output',
		})),
		edges: edges.map((edge) => ({
			id: edge.id,
			source: edge.source,
			target: edge.target,
		})),
	}
}

export default function StrategyBuilderPage() {
	const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
	const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
	const [message, setMessage] = useState('القالب صالح للتجربة التعليمية')
	const validation = useMemo(
		() => validateStrategy(graphFromFlow(nodes, edges)),
		[nodes, edges],
	)
	const onConnect = useCallback(
		(connection: Connection) => {
			if (!connection.source || !connection.target) return
			const candidate = addEdge(
				{ ...connection, id: `edge-${connection.source}-${connection.target}` },
				edges,
			)
			const candidateValidation = validateStrategy(
				graphFromFlow(nodes, candidate),
			)
			if (!candidateValidation.valid) {
				setMessage(`لم تتم الإضافة: ${candidateValidation.errors[0]}`)
				return
			}
			setEdges(candidate)
			setMessage('تم تحديث الرسم — لا يوجد تنفيذ أوامر')
		},
		[edges, nodes, setEdges],
	)
	const reset = () => {
		setNodes(initialNodes)
		setEdges(initialEdges)
		setMessage('تمت استعادة قالب RSI التعليمي')
	}

	return (
		<main className="strategy-builder-page" dir="rtl">
			<header className="strategy-builder-header">
				<div>
					<p className="eyebrow">BORSATY EDUCATION</p>
					<h1>منشئ الاستراتيجيات البصري</h1>
					<p>
						كوّن منطقاً قابلاً للتحقق، ثم اختبره تاريخياً قبل التفكير في أي
						استخدام عملي.
					</p>
				</div>
				<div
					className={`strategy-status ${validation.valid ? 'is-valid' : 'is-invalid'}`}
				>
					{validation.valid ? 'الرسم صالح' : 'الرسم يحتاج إصلاحاً'}
				</div>
			</header>
			<section className="strategy-builder-notice" aria-label="تنبيه تعليمي">
				هذا محرر تعليمي فقط. لا يرسل صفقات ولا يتصل بوسيط، ونتائج المحاكاة
				التاريخية لا تضمن النتائج المستقبلية.
			</section>
			<section className="strategy-builder-toolbar">
				<button type="button" onClick={reset}>
					استعادة القالب
				</button>
				<span>{message}</span>
				{validation.warnings.length > 0 && (
					<small>{validation.warnings[0]}</small>
				)}
			</section>
			<div className="strategy-flow-shell" aria-label="مخطط الاستراتيجية">
				<ReactFlow
					nodes={nodes}
					edges={edges}
					onNodesChange={onNodesChange}
					onEdgesChange={onEdgesChange}
					onConnect={onConnect}
					fitView
					attributionPosition="bottom-left"
				>
					<MiniMap pannable zoomable />
					<Controls />
					<Background gap={20} size={1} />
				</ReactFlow>
			</div>
		</main>
	)
}
