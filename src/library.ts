import type { Node } from '@xyflow/react';
import {
  Activity, Archive, ArrowDownWideNarrow, ArrowLeftRight, Bell, Binary, Blocks, BookOpen, Bot,
  BotMessageSquare, Box, Boxes, Braces, Brain, BrickWall, ChevronsRight, Circle, ClipboardList,
  Clock, Cloud, CloudLightning, Cog, Container, Cpu, Database, DatabaseZap, Diamond, DoorOpen,
  Dumbbell, FileSearch, Files, Filter, FlaskConical, Frame, Gauge, GitBranch, GitCompare, Globe,
  HardDrive, Hexagon, History, Infinity as InfinityIcon, KeyRound, Layers, ListOrdered, Lock,
  MemoryStick, MessageSquareText, Monitor, Network, NotebookPen, Package, Plug, Radar, Radio,
  Rocket, Route, Rows3, Scale, Scaling, Scissors, ScrollText, Search, Server, Share2, ShieldCheck,
  Ship, Shuffle, Signpost, SlidersHorizontal, Smartphone, Sparkles, Split, Square, StickyNote,
  TableProperties, Tags, Terminal, TrendingDown, Type, User, UserCheck, Waypoints, Workflow,
  Wrench, Zap, Leaf, AppWindow, type LucideIcon,
} from 'lucide-react';

export type Kind = 'component' | 'rect' | 'ellipse' | 'diamond' | 'text' | 'note' | 'frame';
export type Item = { id: string; label: string; icon: LucideIcon; kind: Kind };
export type Provider = 'aws' | 'gcp' | 'azure';
export type Category = { id: string; label: string; color: string; items: Item[]; provider?: Provider };
export const PROVIDERS: [Provider, string][] = [['aws', 'AWS'], ['gcp', 'GCP'], ['azure', 'Azure']];

type Row = [id: string, label: string, icon: LucideIcon, kind?: Kind];
const cat = (id: string, label: string, color: string, rows: Row[], provider?: Provider): Category => ({
  id, label, color, provider,
  items: rows.map(([iid, l, icon, kind]) => ({ id: iid, label: l, icon, kind: kind ?? 'component' })),
});

/**
 * The shape library. To add a component, add a row: [unique-id, label, lucide icon].
 */
export const LIBRARY: Category[] = [
  cat('agents', 'AI Agents', '#7c3aed', [
    ['user', 'User', User],
    ['agent', 'Agent', Bot],
    ['subagent', 'Sub-agent', BotMessageSquare],
    ['orchestrator', 'Orchestrator', Workflow],
    ['planner', 'Planner', ListOrdered],
    ['router', 'Router', Split],
    ['tool', 'Tool', Wrench],
    ['mcp', 'MCP Server', Plug],
    ['code-exec', 'Code Sandbox', Terminal],
    ['prompt', 'Prompt / Context', MessageSquareText],
    ['memory-short', 'Short-term Memory', History],
    ['memory-long', 'Long-term Memory', Brain],
    ['knowledge', 'Knowledge Base', BookOpen],
    ['guardrails', 'Guardrails', ShieldCheck],
    ['evaluator', 'Evaluator / Judge', Scale],
    ['hitl', 'Human in the Loop', UserCheck],
  ]),
  cat('llm', 'LLM & Inference', '#db2777', [
    ['llm', 'LLM', Sparkles],
    ['model-gateway', 'Model Gateway', Waypoints],
    ['inference-server', 'Inference Server', Server],
    ['gpu', 'GPU Node', Cpu],
    ['batcher', 'Request Batcher', Layers],
    ['tokenizer', 'Tokenizer', Binary],
    ['kv-cache', 'KV / Prompt Cache', Zap],
    ['semantic-cache', 'Semantic Cache', DatabaseZap],
    ['token-stream', 'Token Streaming', ChevronsRight],
    ['embedding', 'Embedding Model', Boxes],
    ['vector-db', 'Vector DB', Radar],
    ['retriever', 'Retriever', Search],
    ['reranker', 'Reranker', ArrowDownWideNarrow],
    ['chunker', 'Chunker', Scissors],
    ['finetune', 'Fine-tuning / LoRA', SlidersHorizontal],
  ]),
  cat('ml', 'ML Systems', '#d97706', [
    ['data-source', 'Data Source', Files],
    ['etl', 'ETL / Data Pipeline', Filter],
    ['labeling', 'Labeling', Tags],
    ['feature-store', 'Feature Store', TableProperties],
    ['notebook', 'Notebook', NotebookPen],
    ['training', 'Training Job', Dumbbell],
    ['experiments', 'Experiment Tracker', FlaskConical],
    ['registry', 'Model Registry', Archive],
    ['online-serving', 'Model Serving', Rocket],
    ['batch-inference', 'Batch Inference', ClipboardList],
    ['ab-test', 'A/B Test', GitCompare],
    ['monitoring-ml', 'Drift Monitor', TrendingDown],
  ]),
  cat('dist', 'Distributed Systems', '#2563eb', [
    ['client-web', 'Web Client', Monitor],
    ['client-mobile', 'Mobile Client', Smartphone],
    ['dns', 'DNS', Signpost],
    ['cdn', 'CDN', Globe],
    ['lb', 'Load Balancer', Shuffle],
    ['api-gateway', 'API Gateway', DoorOpen],
    ['backend', 'Backend Server', Server],
    ['frontend', 'Frontend App', AppWindow],
    ['service', 'Microservice', Hexagon],
    ['auth', 'Auth Service', Lock],
    ['rate-limiter', 'Rate Limiter', Gauge],
    ['sql', 'SQL Database', Database],
    ['postgres', 'PostgreSQL', Database],
    ['mysql', 'MySQL', Database],
    ['mongo', 'MongoDB', Leaf],
    ['nosql', 'NoSQL Store', Braces],
    ['cache', 'Redis Cache', MemoryStick],
    ['queue', 'Message Queue', Rows3],
    ['kafka', 'Event Stream', Radio],
    ['worker', 'Worker', Cog],
    ['scheduler', 'Scheduler / Cron', Clock],
    ['object-store', 'Object Storage', HardDrive],
    ['search', 'Search Index', FileSearch],
    ['websocket', 'WebSocket', ArrowLeftRight],
  ]),
  cat('devops', 'DevOps & Infra', '#059669', [
    ['cloud', 'Cloud / Region', Cloud],
    ['vpc', 'VPC / Network', Network],
    ['k8s', 'Kubernetes Cluster', Ship],
    ['pod', 'Pod', Box],
    ['container', 'Container', Container],
    ['serverless', 'Serverless Function', CloudLightning],
    ['autoscaler', 'Autoscaler', Scaling],
    ['service-mesh', 'Service Mesh', Share2],
    ['git', 'Git Repo', GitBranch],
    ['cicd', 'CI/CD Pipeline', InfinityIcon],
    ['image-registry', 'Container Registry', Package],
    ['iac', 'IaC (Terraform)', Blocks],
    ['metrics', 'Metrics', Activity],
    ['logs', 'Logs', ScrollText],
    ['tracing', 'Tracing', Route],
    ['alerts', 'Alerting', Bell],
    ['secrets', 'Secrets Manager', KeyRound],
    ['firewall', 'Firewall / WAF', BrickWall],
  ]),
  cat('aws', 'AWS', '#e8590c', [
    ['aws-ec2', 'EC2', Server],
    ['aws-lambda', 'Lambda', CloudLightning],
    ['aws-ecs', 'ECS / Fargate', Container],
    ['aws-eks', 'EKS', Ship],
    ['aws-s3', 'S3', HardDrive],
    ['aws-rds', 'RDS', Database],
    ['aws-aurora', 'Aurora', Database],
    ['aws-dynamodb', 'DynamoDB', Braces],
    ['aws-elasticache', 'ElastiCache (Redis)', MemoryStick],
    ['aws-sqs', 'SQS', Rows3],
    ['aws-sns', 'SNS', Bell],
    ['aws-kinesis', 'Kinesis', Radio],
    ['aws-eventbridge', 'EventBridge', Workflow],
    ['aws-stepfn', 'Step Functions', ListOrdered],
    ['aws-apigw', 'API Gateway', DoorOpen],
    ['aws-alb', 'ALB / ELB', Shuffle],
    ['aws-cloudfront', 'CloudFront', Globe],
    ['aws-route53', 'Route 53', Signpost],
    ['aws-vpc', 'VPC', Network],
    ['aws-iam', 'IAM', Lock],
    ['aws-cognito', 'Cognito', UserCheck],
    ['aws-secrets', 'Secrets Manager', KeyRound],
    ['aws-cloudwatch', 'CloudWatch', Activity],
    ['aws-ecr', 'ECR', Package],
    ['aws-bedrock', 'Bedrock', Sparkles],
    ['aws-sagemaker', 'SageMaker', Dumbbell],
    ['aws-opensearch', 'OpenSearch', FileSearch],
    ['aws-redshift', 'Redshift', TableProperties],
    ['aws-glue', 'Glue', Filter],
  ], 'aws'),
  cat('gcp', 'Google Cloud', '#1a73e8', [
    ['gcp-gce', 'Compute Engine', Server],
    ['gcp-run', 'Cloud Run', Container],
    ['gcp-functions', 'Cloud Functions', CloudLightning],
    ['gcp-gke', 'GKE', Ship],
    ['gcp-gcs', 'Cloud Storage', HardDrive],
    ['gcp-sql', 'Cloud SQL', Database],
    ['gcp-spanner', 'Spanner', Database],
    ['gcp-firestore', 'Firestore', Braces],
    ['gcp-bigtable', 'Bigtable', TableProperties],
    ['gcp-memorystore', 'Memorystore (Redis)', MemoryStick],
    ['gcp-pubsub', 'Pub/Sub', Rows3],
    ['gcp-dataflow', 'Dataflow', Filter],
    ['gcp-bigquery', 'BigQuery', FileSearch],
    ['gcp-apigee', 'API Gateway / Apigee', DoorOpen],
    ['gcp-lb', 'Cloud Load Balancing', Shuffle],
    ['gcp-cdn', 'Cloud CDN', Globe],
    ['gcp-dns', 'Cloud DNS', Signpost],
    ['gcp-vpc', 'VPC', Network],
    ['gcp-iam', 'IAM', Lock],
    ['gcp-secrets', 'Secret Manager', KeyRound],
    ['gcp-monitoring', 'Cloud Monitoring', Activity],
    ['gcp-ar', 'Artifact Registry', Package],
    ['gcp-vertex', 'Vertex AI', Sparkles],
  ], 'gcp'),
  cat('azure', 'Azure', '#0078d4', [
    ['az-vm', 'Virtual Machines', Server],
    ['az-functions', 'Azure Functions', CloudLightning],
    ['az-aca', 'Container Apps', Container],
    ['az-aks', 'AKS', Ship],
    ['az-blob', 'Blob Storage', HardDrive],
    ['az-sql', 'Azure SQL', Database],
    ['az-cosmos', 'Cosmos DB', Braces],
    ['az-redis', 'Azure Cache for Redis', MemoryStick],
    ['az-servicebus', 'Service Bus', Rows3],
    ['az-eventhubs', 'Event Hubs', Radio],
    ['az-apim', 'API Management', DoorOpen],
    ['az-appgw', 'App Gateway / LB', Shuffle],
    ['az-frontdoor', 'Front Door', Globe],
    ['az-dns', 'Azure DNS', Signpost],
    ['az-vnet', 'Virtual Network', Network],
    ['az-entra', 'Entra ID', Lock],
    ['az-keyvault', 'Key Vault', KeyRound],
    ['az-monitor', 'Azure Monitor', Activity],
    ['az-acr', 'Container Registry', Package],
    ['az-openai', 'Azure OpenAI', Sparkles],
    ['az-ml', 'Azure ML', Dumbbell],
    ['az-search', 'AI Search', FileSearch],
    ['az-synapse', 'Synapse', TableProperties],
  ], 'azure'),
  cat('basics', 'Basic Shapes', '#64748b', [
    ['rect', 'Rectangle', Square, 'rect'],
    ['ellipse', 'Ellipse', Circle, 'ellipse'],
    ['diamond', 'Decision', Diamond, 'diamond'],
    ['text', 'Text', Type, 'text'],
    ['note', 'Sticky Note', StickyNote, 'note'],
    ['frame', 'Group Frame', Frame, 'frame'],
  ]),
];

const INDEX = new Map<string, { item: Item; cat: Category }>();
for (const c of LIBRARY) for (const item of c.items) INDEX.set(item.id, { item, cat: c });

export const iconFor = (id: string): LucideIcon => INDEX.get(id)?.item.icon ?? Box;

export const SWATCHES = ['#7c3aed', '#db2777', '#d97706', '#2563eb', '#059669', '#dc2626', '#0891b2', '#64748b'];

let counter = 0;
export const uid = (p = 'n') => `${p}_${Date.now().toString(36)}${(counter++).toString(36)}`;

/** Build a canvas node for a library item, with `pos` as its top-left corner. */
export function makeNode(itemId: string, pos: { x: number; y: number }, data: Record<string, unknown> = {}): Node {
  const found = INDEX.get(itemId) ?? INDEX.get('rect')!;
  const { item, cat: c } = found;
  const base = { id: uid(), position: pos };
  switch (item.kind) {
    case 'rect':
    case 'ellipse':
    case 'diamond':
      return { ...base, type: 'shape', width: 160, height: item.kind === 'diamond' ? 110 : 80, data: { shape: item.kind, label: '', color: c.color, ...data } };
    case 'text':
      return { ...base, type: 'text', data: { label: 'Text', size: 20, ...data } };
    case 'note':
      return { ...base, type: 'note', width: 180, height: 130, data: { label: '', ...data } };
    case 'frame':
      return { ...base, type: 'frame', width: 440, height: 260, zIndex: -1, data: { label: 'Group', color: c.color, ...data } };
    default:
      return { ...base, type: 'component', width: 190, data: { label: item.label, sub: '', icon: item.id, color: c.color, ...data } };
  }
}
