// data/questions.json の英語原文(en)の破損を修正する。
// 破損は ExamTopics からの収集時点で混入したもの（単語結合・綴り崩れ・文字化け）。
// 日本語訳は正しく訳されているものが大半なので、原則 en のみを直す。
// 使い方: node tools/fix-source-broken.mjs [--apply]
import { readFileSync, writeFileSync } from "node:fs";

const SRC = new URL("../data/questions.json", import.meta.url);
const APPLY = process.argv.includes("--apply");

/**
 * 修正定義。
 * target: "q" は問題文、"A"〜"F" は選択肢のキー。
 * all: true のときは同一フィールド内の全出現を置換する。
 */
const FIXES = [
  // --- 文末のピリオドが失われ、次の文と結合したもの（VPC. / ALB. / NLB. など） ---
  { id: "saa-c03-0019", target: "C", find: "inspection VPConfigure", replace: "inspection VPC. Configure" },
  { id: "saa-c03-0062", target: "B", find: "ALUse", replace: "ALB. Use" },
  { id: "saa-c03-0135", target: "C", find: "VPUpdate", replace: "VPC. Update" },
  { id: "saa-c03-0188", target: "C", find: "a VPInstruct", replace: "a VPC. Instruct" },
  { id: "saa-c03-0408", target: "B", find: "NLProcess", replace: "NLB. Process" },
  { id: "saa-c03-0439", target: "C", find: "VPUpdate", replace: "VPC. Update" },
  { id: "saa-c03-0510", target: "C", find: "VPUpdate", replace: "VPC. Update" },
  { id: "saa-c03-0549", target: "C", find: "VPModify", replace: "VPC. Modify" },
  { id: "saa-c03-0571", target: "A", find: "CImport", replace: "CA. Import" },
  { id: "saa-c03-0608", target: "B", find: "ALConfigure", replace: "ALB. Configure" },
  { id: "saa-c03-0608", target: "B", find: "ALModify", replace: "ALB. Modify" },
  { id: "saa-c03-0697", target: "B", find: "ALEnsure", replace: "ALB. Ensure" },
  { id: "saa-c03-0722", target: "C", find: "VPConnect", replace: "VPC. Connect" },
  { id: "saa-c03-0722", target: "C", find: "VPCreate", replace: "VPC. Create" },
  { id: "saa-c03-0766", target: "C", find: "VPConfigure", replace: "VPC. Configure" },
  { id: "saa-c03-0782", target: "C", find: "VPSet", replace: "VPC. Set" },
  { id: "saa-c03-0811", target: "C", find: "a VPCreate", replace: "a VPC. Create" },
  { id: "saa-c03-0839", target: "C", find: "VPUpdate", replace: "VPC. Update" },
  { id: "saa-c03-0860", target: "C", find: "VPIn", replace: "VPC. In" },
  { id: "saa-c03-0866", target: "C", find: "VPCreate", replace: "VPC. Create" },
  { id: "saa-c03-0899", target: "C", find: "VPAdd", replace: "VPC. Add" },
  { id: "saa-c03-0917", target: "B", find: "NLUse", replace: "NLB. Use" },
  { id: "saa-c03-0927", target: "B", find: "ALCreate", replace: "ALB. Create" },
  { id: "saa-c03-0950", target: "C", find: "VPConfigure", replace: "VPC. Configure", all: true },
  { id: "saa-c03-0955", target: "B", find: "ALUpdate", replace: "ALB. Update" },
  { id: "saa-c03-0980", target: "C", find: "VPUpdate", replace: "VPC. Update" },
  { id: "saa-c03-0983", target: "C", find: "VPRoute", replace: "VPC. Route" },
  { id: "saa-c03-0998", target: "C", find: "VPConfigure", replace: "VPC. Configure" },
  { id: "saa-c03-0025", target: "B", find: "DynamoDProvision", replace: "DynamoDB. Provision" },
  { id: "saa-c03-0063", target: "B", find: "DynamoDUse", replace: "DynamoDB. Use" },
  { id: "saa-c03-0607", target: "B", find: "24 TiChange", replace: "24 TiB. Change" },

  // --- ピリオド欠落による2文の連結 ---
  { id: "saa-c03-0481", target: "q", find: "Multi-AZAmazon", replace: "Multi-AZ Amazon" },
  { id: "saa-c03-0481", target: "q", find: "the database layer Amazon ElastiCache", replace: "the database layer. Amazon ElastiCache" },
  { id: "saa-c03-0420", target: "B", find: "DB duster deployment Create", replace: "DB cluster deployment. Create" },
  { id: "saa-c03-0248", target: "q", find: "is not being processed Amazon CloudWatch", replace: "is not being processed. Amazon CloudWatch" },
  // サービス名の途中に句点が入って2文に割れている
  { id: "saa-c03-0956", target: "A", find: "S3 Glacier Instant. Retrieval", replace: "S3 Glacier Instant Retrieval" },

  // --- 単語の分断・スペースの欠落 ---
  { id: "saa-c03-0434", target: "q", find: "anotherAWS", replace: "another AWS" },
  { id: "saa-c03-0440", target: "q", find: "ofAmazon", replace: "of Amazon" },
  { id: "saa-c03-0459", target: "q", find: "ofAWS", replace: "of AWS" },
  { id: "saa-c03-0637", target: "q", find: "ofAWS", replace: "of AWS" },
  { id: "saa-c03-0639", target: "q", find: "ofAmazon", replace: "of Amazon" },
  { id: "saa-c03-0969", target: "q", find: "usesASP", replace: "uses ASP" },
  { id: "saa-c03-0116", target: "q", find: "anew ", replace: "a new " },
  { id: "saa-c03-0172", target: "q", find: "should.be", replace: "should be" },
  { id: "saa-c03-0419", target: "C", find: "whenthe", replace: "when the" },
  { id: "saa-c03-0437", target: "C", find: "incomingtraffic", replace: "incoming traffic" },
  { id: "saa-c03-0483", target: "D", find: "every10", replace: "every 10" },
  { id: "saa-c03-0943", target: "C", find: "Cost Explorerto", replace: "Cost Explorer to" },
  { id: "saa-c03-0943", target: "D", find: "todownload", replace: "to download" },
  { id: "saa-c03-0948", target: "C", find: "toreplicate", replace: "to replicate" },
  { id: "saa-c03-0910", target: "A", find: "QuickS ght", replace: "QuickSight" },
  { id: "saa-c03-1009", target: "q", find: "da ta", replace: "data" },
  { id: "saa-c03-1015", target: "q", find: "up load", replace: "upload" },
  { id: "saa-c03-0644", target: "A", find: "example com", replace: "example.com" },
  { id: "saa-c03-0003", target: "A", find: "aws PrincipalOrgID", replace: "aws:PrincipalOrgID" },

  // --- OCR 由来の綴り崩れ ---
  { id: "saa-c03-0046", target: "D", find: "the meats", replace: "the objects" },
  { id: "saa-c03-0134", target: "q", find: "by using SL", replace: "by using SQL" },
  { id: "saa-c03-0299", target: "A", find: "Sat each volume’ tiering", replace: "Set each volume’s tiering" },
  { id: "saa-c03-0299", target: "A", find: "the fila system", replace: "the file system" },
  { id: "saa-c03-0475", target: "q", find: "mount target m each", replace: "mount target in each" },
  { id: "saa-c03-0543", target: "q", find: "individually bled", replace: "individually billed" },
  { id: "saa-c03-0543", target: "q", find: "Savings Pian", replace: "Savings Plan" },
  { id: "saa-c03-0007", target: "D", find: "Amazon SOS", replace: "Amazon SQS" },
  { id: "saa-c03-0636", target: "C", find: "SOS queue", replace: "SQS queue" },
  { id: "saa-c03-0650", target: "A", find: "Microsoft SOL Server", replace: "Microsoft SQL Server" },
  { id: "saa-c03-0018", target: "E", find: "Amazon ample Notification Service", replace: "Amazon Simple Notification Service" },
  { id: "saa-c03-0879", target: "E", find: "Amazon AP! Gateway", replace: "Amazon API Gateway" },
  { id: "saa-c03-0892", target: "D", find: "AWS Mitigation Hub", replace: "AWS Migration Hub" },
  { id: "saa-c03-0687", target: "E", find: "Forsecast", replace: "Forecast" },
  { id: "saa-c03-0794", target: "D", find: "EventBndge", replace: "EventBridge" },
  { id: "saa-c03-1006", target: "C", find: "PatchLoadBalanacerInstance", replace: "PatchLoadBalancerInstance" },
  { id: "saa-c03-0080", target: "q", find: "needs ta share", replace: "needs to share" },
  { id: "saa-c03-0109", target: "q", find: "ability 10 delete", replace: "ability to delete" },
  { id: "saa-c03-0297", target: "D", find: "matric", replace: "metric" },
  { id: "saa-c03-0473", target: "A", find: "state files", replace: "static files" },
  { id: "saa-c03-0538", target: "B", find: "URL tor restricted", replace: "URL for restricted" },
  { id: "saa-c03-0598", target: "B", find: "File Gateway made", replace: "File Gateway mode" },
  { id: "saa-c03-0627", target: "B", find: "zone tiles", replace: "zone files" },
  { id: "saa-c03-0641", target: "D", find: "tor analysis", replace: "for analysis" },
  { id: "saa-c03-0643", target: "A", find: "tor analysis", replace: "for analysis" },
  { id: "saa-c03-0733", target: "A", find: "to identity the failed", replace: "to identify the failed" },
  { id: "saa-c03-0784", target: "B", find: "a regular internal", replace: "a regular interval" },
  { id: "saa-c03-0915", target: "C", find: "duster", replace: "cluster", all: true },
  { id: "saa-c03-0915", target: "D", find: "duster", replace: "cluster", all: true },
  { id: "saa-c03-0947", target: "D", find: "retneve", replace: "retrieve" },
  { id: "saa-c03-0968", target: "A", find: "buckets tor storage", replace: "buckets for storage" },
  { id: "saa-c03-0986", target: "q", find: "SSO", replace: "SSD", all: true },
  { id: "saa-c03-1012", target: "q", find: "halls", replace: "halts" },
  { id: "saa-c03-1017", target: "q", find: "meals", replace: "meets" },
  { id: "saa-c03-1018", target: "A", find: "rotes", replace: "roles" },
  // キリル文字の Е (U+0415) が混入している
  { id: "saa-c03-0516", target: "q", find: "Еhe", replace: "The" },

  // --- 訳にも影響しているもの（en/ja 両方を直す） ---
  { id: "saa-c03-0311", target: "A", find: "to pool messages", replace: "to poll messages" },
  {
    id: "saa-c03-0311", target: "A", lang: "ja",
    find: "からメッセージをプールするよう設定する",
    replace: "からメッセージをポーリングして取得するよう設定する",
  },

  // --- 構造の破損 ---
  // 問題文の冒頭に前問の選択肢が混入している
  {
    id: "saa-c03-0775", target: "q",
    find: "Use Amazon Elastic Kubernetes Service (Amazon EKS) with Amazon EC2 worker nodes.\n\n",
    replace: "",
  },
  // 選択肢Dに別バージョンのDが二重に混入している。
  // 高可用性(複数AZ)が要件なので、2 public + 2 private の後半が正しい選択肢。
  // 投票は AD が62%で、この後半の内容を指していると判断し前半を削除する。
  {
    id: "saa-c03-0125", target: "D",
    find: "Configure a VPC with one public subnet, one private subnet, and two NAT gateways across two Availability Zones. Deploy an Application Load Balancer in the public subnet.D. ",
    replace: "",
  },
  {
    id: "saa-c03-0125", target: "D", lang: "ja",
    find: "1つのパブリックサブネット、1つのプライベートサブネット、2つのAvailability Zoneにまたがる2つのNATゲートウェイを持つVPCを設定する。Application Load Balancerをパブリックサブネットにデプロイする。",
    replace: "",
  },
];

/* ---------- 適用 ---------- */
const text = readFileSync(SRC, "utf8");
const arr = JSON.parse(text);
const byId = new Map(arr.map((q) => [q.id, q]));

const field = (q, target, lang) => {
  if (target === "q") return [q.question, lang];
  const o = q.options.find((x) => x.key === target);
  return o ? [o.text, lang] : [null, lang];
};

let ok = 0;
const problems = [];
for (const f of FIXES) {
  const q = byId.get(f.id);
  if (!q) { problems.push(`${f.id}: 問題が見つからない`); continue; }
  const lang = f.lang ?? "en";
  const [holder] = field(q, f.target, lang);
  if (!holder) { problems.push(`${f.id} ${f.target}: 選択肢が見つからない`); continue; }

  const cur = holder[lang];
  const hits = cur.split(f.find).length - 1;
  if (hits === 0) { problems.push(`${f.id} ${f.target}(${lang}): "${f.find}" が見つからない`); continue; }
  if (hits > 1 && !f.all) { problems.push(`${f.id} ${f.target}(${lang}): "${f.find}" が${hits}箇所（allが必要）`); continue; }

  holder[lang] = f.all ? cur.split(f.find).join(f.replace) : cur.replace(f.find, f.replace);
  ok++;
}

console.log(`適用可能 ${ok} / ${FIXES.length} 件`);
if (problems.length) {
  console.log("\n【要確認】");
  problems.forEach((p) => console.log("  -", p));
}

if (APPLY && problems.length === 0) {
  writeFileSync(SRC, JSON.stringify(arr, null, 2) + "\n", "utf8");
  console.log("\ndata/questions.json を更新しました。");
} else if (APPLY) {
  console.log("\n要確認があるため書き込みを中止しました。");
} else {
  console.log("\n（--apply を付けると書き込みます）");
}
