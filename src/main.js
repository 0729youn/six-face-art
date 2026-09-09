const FACE_NAMES = [
"윗면",
"앞면",
"오른쪽",
"뒷면",
"왼쪽",
"아랫면"
];

const LAYERS = [
{ key: "bg", label: "배경" },
{ key: "character", label: "캐릭터" },
{ key: "frame", label: "프레임" }
];

const facesEl = document.getElementById("faces");
const previewBtn = document.getElementById("preview");
const saveBtn = document.getElementById("save");
const msgEl = document.getElementById("msg");
const progressWrap = document.getElementById("progressWrap");
const fillEl = document.getElementById("fill");
const pctEl = document.getElementById("pct");

const files = Array.from({ length: 6 }, () => ({
bg: null,
character: null,
frame: null
}));

const depths = Array.from({ length: 6 }, () => ({
bg: 0,
character: 0.03,
frame: 0.06
}));

function message(text) {
msgEl.textContent = text;
}

function createFaceUI() {
facesEl.innerHTML = "";

for (let i = 0; i < 6; i++) {
const box = document.createElement("section");
box.className = "face";

const title = document.createElement("h3");
title.textContent = `${i + 1}. ${FACE_NAMES[i]}`;
box.appendChild(title);

for (const layer of LAYERS) {
  const label = document.createElement("label");
  label.textContent = `${layer.label} 이미지`;

  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/jpeg,image/png,image/webp,image/gif";

  input.addEventListener("change", () => {
    const file = input.files?.[0] || null;
    files[i][layer.key] = file;

    if (file) {
      message(
        `${FACE_NAMES[i]}의 ${layer.label} 이미지를 선택했습니다.`
      );
    }
  });

  label.appendChild(input);
  box.appendChild(label);

  const depthLabel = document.createElement("label");
  depthLabel.textContent = `${layer.label} 깊이`;

  const range = document.createElement("input");
  range.type = "range";
  range.min = "-0.5";
  range.max = "0.5";
  range.step = "0.01";
  range.value = depths[i][layer.key];

  range.addEventListener("input", () => {
    depths[i][layer.key] = Number(range.value);
  });

  depthLabel.appendChild(range);
  box.appendChild(depthLabel);
}

facesEl.appendChild(box);

}
}

function getDimensions() {
const w = Number(document.getElementById("W").value);
const h = Number(document.getElementById("H").value);
const d = Number(document.getElementById("D").value);

if (!(w > 0 && h > 0 && d > 0)) {
throw new Error("가로, 높이, 깊이를 올바르게 입력해주세요.");
}

return { w, h, d };
}

function buildMeta() {
return {
dim: getDimensions(),
depth: depths.map((face) => ({ ...face }))
};
}

function collectPreviewFiles() {
const result = {};

for (let i = 0; i < 6; i++) {
for (const layer of LAYERS) {
const file = files[i][layer.key];

  if (file) {
    result[`${i}:${layer.key}`] = file;
  }
}

}

return result;
}

previewBtn.addEventListener("click", () => {
try {
const meta = buildMeta();
const previewFiles = collectPreviewFiles();

if (Object.keys(previewFiles).length === 0) {
  message("먼저 하나 이상의 이미지를 선택해주세요.");
  return;
}

const url = `/viewer.html?preview=1`;
const popup = window.open(url, "_blank");

if (!popup) {
  message("미리보기 창이 차단되었습니다. 팝업 허용 후 다시 눌러주세요.");
  return;
}

const send = () => {
  popup.postMessage(
    {
      type: "sixFacePreview",
      meta,
      files: previewFiles
    },
    location.origin
  );
};

setTimeout(send, 500);

message("관람객 시점 미리보기를 여는 중입니다.");

} catch (error) {
message(error.message || "미리보기를 열지 못했습니다.");
}
});

function makeId() {
const chars =
"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

let id = "";

for (let i = 0; i < 9; i++) {
id += chars[Math.floor(Math.random() * chars.length)];
}

return id;
}

async function requestUploadToken(pathname, type) {
const response = await fetch("/api/upload", {
method: "POST",
headers: {
"content-type": "application/json"
},
body: JSON.stringify({
type: "blob.generate-client-token",
payload: {
pathname,
callbackUrl: "${location.origin}/api/upload"
}
})
});

if (!response.ok) {
let text = "";

try {
  text = await response.text();
} catch {}

throw new Error(
  text || `업로드 권한 요청 실패 (${response.status})`
);

}

return response.json();
}

async function uploadBlob(file, pathname) {
const token = await requestUploadToken(pathname, file.type);

const response = await fetch(
"https://blob.vercel-storage.com/${encodeURIComponent(pathname)}",
{
method: "PUT",
headers: {
"content-type": file.type,
authorization: "Bearer ${token.token}"
},
body: file
}
);

if (!response.ok) {
throw new Error("이미지 업로드 실패 (${response.status})");
}

const data = await response.json();

return data.url || data.downloadUrl;
}

async function saveWork() {
const id = makeId();
const uploaded = Array.from({ length: 6 }, () => ({}));

const imageEntries = [];

for (let i = 0; i < 6; i++) {
for (const layer of LAYERS) {
const file = files[i][layer.key];

  if (!file) continue;

  imageEntries.push({
    i,
    key: layer.key,
    file
  });
}

}

if (imageEntries.length === 0) {
throw new Error("저장할 이미지가 없습니다.");
}

progressWrap.style.display = "block";
fillEl.style.width = "0%";
pctEl.textContent = "0%";

for (let n = 0; n < imageEntries.length; n++) {
const { i, key, file } = imageEntries[n];

const safeName =
  file.name.replace(/[^A-Za-z0-9._-]/g, "_") || "image";

const pathname = `works/${id}/face${i}_${key}_${safeName}`;

const url = await uploadBlob(file, pathname);

uploaded[i][key] = url;

const percent = Math.round(((n + 1) / imageEntries.length) * 90);

fillEl.style.width = `${percent}%`;
pctEl.textContent = `${percent}%`;

}

const manifest = {
id,
dim: getDimensions(),
depth: depths.map((face) => ({ ...face })),
files: uploaded
};

const manifestBlob = new Blob(
[JSON.stringify(manifest)],
{ type: "application/json" }
);

const manifestFile = new File(
[manifestBlob],
"manifest.json",
{ type: "application/json" }
);

await uploadBlob(
manifestFile,
"works/${id}/manifest.json"
);

fillEl.style.width = "100%";
pctEl.textContent = "100%";

const shareUrl =
"${location.origin}/work/${encodeURIComponent(id)}";

msgEl.innerHTML =
"저장 완료!<br><a href="${shareUrl}" target="_blank">${shareUrl}</a>";

return shareUrl;
}

saveBtn.addEventListener("click", async () => {
try {
saveBtn.disabled = true;
previewBtn.disabled = true;

message("작품을 온라인 저장소에 업로드하는 중입니다.");

await saveWork();

} catch (error) {
console.error(error);

progressWrap.style.display = "none";

message(
  `저장 실패: ${error.message || "알 수 없는 오류"}`
);

} finally {
saveBtn.disabled = false;
previewBtn.disabled = false;
}
});

window.closePreview = function () {
const box = document.getElementById("previewBox");

if (box) {
box.style.display = "none";
}
};

createFaceUI();
message("각 면의 배경·캐릭터·프레임 이미지를 선택해주세요.");
