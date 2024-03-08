// Fetches data from Azure Blob Storage
async function fetchBlobs() {
  const storageAccount = "apkdownload";
  const containerName = "apkdownloads";
  const sasToken =
    "?sv=2022-11-02&ss=bfqt&srt=sco&sp=rlpitf&se=2024-03-29T16:20:45Z&st=2024-02-13T08:20:45Z&spr=https&sig=q0xoU%2BW06IzLCQLcIo0maUYtG4zwPiYsh6WDGdyJTLQ%3D";
  const baseUrl = `https://${storageAccount}.blob.core.windows.net/${containerName}${sasToken}&restype=container&comp=list`;

  try {
    const response = await fetch(baseUrl);
    const data = await response.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(data, "text/xml");

    const blobs = xmlDoc.getElementsByTagName("Blob");
    const jsonFiles = [];

    for (let i = 0; i < blobs.length; i++) {
      const blob = blobs[i];
      const blobName = blob.getElementsByTagName("Name")[0].textContent;

      if (blobName.endsWith("_description.json")) {
        jsonFiles.push(blobName);
      }
    }

    const fileDetails = await Promise.all(
      jsonFiles.map(async (blobName) => {
        const jsonFileUrl = `https://${storageAccount}.blob.core.windows.net/${containerName}/${blobName}${sasToken}`;
        const response = await fetch(jsonFileUrl);
        const json = await response.json();
        return { json, blobName };
      })
    );

    fileDetails.sort(
      (a, b) => new Date(b.json.releaseDate) - new Date(a.json.releaseDate)
    );

    fileDetails.forEach(({ json, blobName }, index) => {
      const apkName = blobName.replace("_description.json", ".apk");
      const apkFileUrl = `https://${storageAccount}.blob.core.windows.net/${containerName}/${apkName}${sasToken}`;
      const isLatest = index === 0;
      const fileItemDiv = createFileItem(json, apkFileUrl, isLatest);
      document.getElementById("file-list").appendChild(fileItemDiv);
    });
  } catch (error) {
    console.error("Error fetching blob data:", error);
  }
}

// Prepare HTML elements for the file item
function createFileItem(apkFile, apkFileUrl, isLatest) {
  const fileItemDiv = document.createElement("div");
  fileItemDiv.className =
    "rounded-lg border bg-card text-card-foreground shadow-sm w-full max-w-lg";

  const fileHeader = document.createElement("div");
  fileHeader.className = "flex flex-col space-y-1.5 p-6";

  // Title and Download Link
  const titleDiv = document.createElement("div");
  titleDiv.className = "flex justify-between items-center";
  const title = document.createElement("h3");
  title.className =
    "text-2xl font-semibold whitespace-nowrap leading-none tracking-tight";
  title.textContent = `${apkFile.appName} - v.${apkFile.version}`;
  if (isLatest) {
    const latestLabel = document.createElement("span");
    latestLabel.textContent = " (latest)";
    latestLabel.style.color = "#02a79c";
    title.appendChild(latestLabel);
  }
  titleDiv.appendChild(title);

  const downloadLink = document.createElement("a");
  downloadLink.href = apkFileUrl;
  downloadLink.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-6 h-6 cursor-pointer"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" x2="12" y1="15" y2="3"></line></svg>`;
  titleDiv.appendChild(downloadLink);

  fileHeader.appendChild(titleDiv);

  // Description
  //const description = document.createElement("p");
  //description.className = "text-sm text-muted-foreground";
  //description.textContent = apkFile.description;
  //fileHeader.appendChild(description);

  fileItemDiv.appendChild(fileHeader);

  const fileDetails = document.createElement("div");
  fileDetails.className = "p-6 grid gap-4";

  // File Size
  const fileSizeDiv = document.createElement("div");
  fileSizeDiv.className = "flex items-center gap-2";
  fileSizeDiv.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-6 h-6"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>`;
  const fileSizeText = document.createElement("span");
  fileSizeText.className = "text-sm";
  fileSizeText.textContent = `File Size: ${apkFile.fileSize}`;
  fileSizeDiv.appendChild(fileSizeText);
  fileDetails.appendChild(fileSizeDiv);

  // Minimum OS Version
  const minOSDiv = document.createElement("div");
  minOSDiv.className = "flex items-center gap-2";
  minOSDiv.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-6 h-6"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>`;
  const minOSText = document.createElement("span");
  minOSText.className = "text-sm";
  minOSText.textContent = `Minimum OS Version: ${apkFile.minimumOSVersion}`;
  minOSDiv.appendChild(minOSText);
  fileDetails.appendChild(minOSDiv);

  // Features
  const featuresDiv = document.createElement("div");
  featuresDiv.className = "text-sm";
  const featuresTitle = document.createElement("h4");
  featuresTitle.className = "font-medium";
  featuresTitle.textContent = "Features:";
  featuresDiv.appendChild(featuresTitle);

  const featuresList = document.createElement("ul");
  featuresList.className = "list-disc list-inside";
  apkFile.features.forEach((feature) => {
    const featureItem = document.createElement("li");
    featureItem.textContent = feature;
    featuresList.appendChild(featureItem);
  });
  featuresDiv.appendChild(featuresList);
  fileDetails.appendChild(featuresDiv);

  // Bug Fixes
  const bugFixesDiv = document.createElement("div");
  bugFixesDiv.className = "text-sm";
  const bugFixesTitle = document.createElement("h4");
  bugFixesTitle.className = "font-medium";
  bugFixesTitle.textContent = "Bug Fixes:";
  bugFixesDiv.appendChild(bugFixesTitle);

  const bugFixesList = document.createElement("ul");
  bugFixesList.className = "list-disc list-inside";
  apkFile.bugFixes.forEach((bug) => {
    const bugItem = document.createElement("li");
    bugItem.textContent = bug;
    bugFixesList.appendChild(bugItem);
  });
  bugFixesDiv.appendChild(bugFixesList);
  fileDetails.appendChild(bugFixesDiv);

  fileItemDiv.appendChild(fileDetails);

  return fileItemDiv;
}

// Fetch data when the DOM is loaded
document.addEventListener("DOMContentLoaded", fetchBlobs);
