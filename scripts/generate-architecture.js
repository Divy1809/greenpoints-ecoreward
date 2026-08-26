/** Generates both an editable draw.io source and a rendered SVG architecture diagram. */
const fs = require('node:fs');
const path = require('node:path');
const out = path.join(__dirname, '..', 'architecture');
fs.mkdirSync(out, { recursive: true });

const services = [
  ['Amazon S3 + CloudFront', 240, 170, '#eaf5ee'], ['Amazon Cognito', 240, 350, '#f5edff'],
  ['Amazon API Gateway', 530, 255, '#fff4dd'], ['AWS Lambda', 805, 255, '#fff0e7'],
  ['Amazon DynamoDB', 1080, 170, '#e7f2ff'], ['Amazon CloudWatch', 1080, 350, '#eef1f6'],
  ['Amazon SNS / EventBridge', 805, 455, '#fff7e9'], ['Amazon Athena + QuickSight', 1080, 530, '#edf8f3'],
];
const modules = [['Login / Auth', 80, 690], ['Add Eco Activity', 355, 690], ['Leaderboard', 655, 690], ['Monthly Reports', 900, 690], ['Badges / Rewards', 1160, 690]];
const escape = (s) => s.replace(/&/g,'&amp;').replace(/</g,'&lt;');
function box([label,x,y,color]) { return `<g><rect x="${x-100}" y="${y-48}" width="200" height="96" rx="12" fill="${color}" stroke="#28724d" stroke-width="2"/><text x="${x}" y="${y-6}" text-anchor="middle" font-size="20" font-weight="700" fill="#12352b">${escape(label.split(' + ')[0])}</text>${label.includes(' + ') ? `<text x="${x}" y="${y+22}" text-anchor="middle" font-size="18" fill="#12352b">${escape(label.split(' + ')[1])}</text>` : ''}</g>`; }
function arrow(x1,y1,x2,y2,label='') { return `<path d="M ${x1} ${y1} L ${x2} ${y2}" stroke="#286c4d" stroke-width="3" fill="none" marker-end="url(#arrow)"/>${label?`<text x="${(x1+x2)/2}" y="${(y1+y2)/2-10}" text-anchor="middle" font-size="14" fill="#365f4a">${escape(label)}</text>`:''}`; }
const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="850" viewBox="0 0 1400 850">
<defs><marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0,0 L0,6 L9,3 z" fill="#286c4d"/></marker></defs>
<rect width="1400" height="850" fill="#ffffff"/><text x="70" y="65" font-family="Arial,sans-serif" font-size="36" font-weight="700" fill="#12352b">GreenPoints — Proposed AWS Cloud Architecture</text><text x="70" y="100" font-family="Arial,sans-serif" font-size="18" fill="#476356">Secure, serverless flow for eco-action rewards and insights</text>
<rect x="160" y="125" width="1160" height="490" rx="22" fill="#f7fbf8" stroke="#78b18d" stroke-width="2"/><text x="190" y="152" font-size="18" font-family="Arial" font-weight="700" fill="#28724d">AWS Cloud</text>
<g font-family="Arial,sans-serif">${services.map(box).join('')}
<g><circle cx="65" cy="260" r="34" fill="#d7eee0" stroke="#28724d" stroke-width="2"/><circle cx="65" cy="244" r="11" fill="#28724d"/><path d="M42 289 Q65 260 88 289" fill="#28724d"/><text x="65" y="320" text-anchor="middle" font-size="19" font-weight="700" fill="#12352b">User</text></g>
${arrow(99,260,140,260,'HTTPS')}${arrow(340,218,430,265,'static app')}${arrow(340,350,430,295,'sign-in token')}${arrow(630,255,705,255,'validated request')}${arrow(905,255,980,218,'activity + points')}${arrow(905,300,980,350,'logs / metrics')}<path d="M 980 218 L 930 218 L 930 455 L 905 455" stroke="#286c4d" stroke-width="3" fill="none" marker-end="url(#arrow)"/><text x="923" y="338" text-anchor="end" font-size="14" fill="#365f4a">threshold event</text><path d="M 1180 218 L 1250 218 L 1250 530 L 1180 530" stroke="#286c4d" stroke-width="3" fill="none" marker-end="url(#arrow)"/><text x="1257" y="405" font-size="14" fill="#365f4a">analytics export</text>
<text x="690" y="640" text-anchor="middle" font-size="18" font-family="Arial" fill="#476356">Application modules served by this platform</text>
${modules.map(([label,x,y])=>`<g><rect x="${x-105}" y="${y-26}" width="210" height="52" rx="9" fill="#f1f6f3" stroke="#78b18d"/><text x="${x}" y="${y+7}" text-anchor="middle" font-family="Arial" font-size="17" font-weight="700" fill="#12352b">${escape(label)}</text></g>`).join('')}
${arrow(80,690,240,690)}${arrow(460,690,550,690)}${arrow(760,690,795,690)}${arrow(1005,690,1055,690)}</g>
<text x="70" y="810" font-family="Arial" font-size="15" fill="#476356">Data flow: user → S3/CloudFront → API Gateway → Lambda → DynamoDB → CloudWatch / SNS / analytics</text></svg>`;
fs.writeFileSync(path.join(out, 'architecture.svg'), svg);

const mx = services.map(([label,x,y], i) => `<mxCell id="s${i}" value="${escape(label)}" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#eaf5ee;strokeColor=#28724d;" vertex="1" parent="1"><mxGeometry x="${x-100}" y="${y-48}" width="200" height="96" as="geometry"/></mxCell>`).join('');
const mxModules = modules.map(([label,x,y], i) => `<mxCell id="m${i}" value="${escape(label)}" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#f1f6f3;strokeColor=#78b18d;" vertex="1" parent="1"><mxGeometry x="${x-105}" y="${y-26}" width="210" height="52" as="geometry"/></mxCell>`).join('');
const drawio = `<mxfile host="app.diagrams.net"><diagram name="GreenPoints AWS Architecture"><mxGraphModel dx="1400" dy="850" grid="1" gridSize="10" page="1" pageWidth="1400" pageHeight="850"><root><mxCell id="0"/><mxCell id="1" parent="0"/><mxCell id="title" value="GreenPoints — Proposed AWS Cloud Architecture" style="text;html=1;fontSize=28;fontStyle=1;fontColor=#12352b;" vertex="1" parent="1"><mxGeometry x="70" y="40" width="800" height="50" as="geometry"/></mxCell><mxCell id="cloud" value="AWS Cloud" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#f7fbf8;strokeColor=#78b18d;verticalAlign=top;" vertex="1" parent="1"><mxGeometry x="160" y="125" width="1160" height="490" as="geometry"/></mxCell>${mx}${mxModules}</root></mxGraphModel></diagram></mxfile>`;
fs.writeFileSync(path.join(out, 'architecture.drawio'), drawio);
console.log('Created architecture/architecture.svg and architecture/architecture.drawio');
