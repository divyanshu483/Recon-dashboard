let filesData = [];
let mrpMap = {}; // SKU → MRP map
let missingSKUs = [];

// Configuration for different file types
const fileConfigs = [
    {
        nameMatch: "Converse Tally Cancel GST Report_",
        columns: [1,2,4,5,6,7,8,11,12,17,24,25,27,29,45,47,56,61]
    },
    {
        nameMatch: "Tally Return GST Report_",
        columns: [0,1,4,5,6,7,8,11,12,17,24,25,27,29,51,56,62,63,64]
    },
    {
        nameMatch: "Item Master_",
        columns: [1,25]
    },
    {
        nameMatch: "Invoice_",
        columns: [0,1,4,9,10,11,12,13,14,16,17,19,20,21,37,42]
    }
];
document.getElementById('fileInput').addEventListener('change', handleFiles);

function handleFiles(event){

const files = event.target.files;
filesData = [];

let promises = [];

Array.from(files).forEach(file=>{

const config = fileConfigs.find(cfg =>
file.name.toLowerCase().includes(cfg.nameMatch.toLowerCase())
);

if(config){

const reader = new FileReader();

const promise = new Promise(resolve=>{
reader.onload = e => resolve({
content:e.target.result,
config:config
});
});

reader.readAsText(file);
promises.push(promise);

}else{
console.log("Ignored file:",file.name);
}

});

if(promises.length===0){
alert("No matching files found.");
return;
}

Promise.all(promises).then(results=>{
filesData = results;
compileCSV();
});

}

const headerAliases = {
"Original Invoice No":"Invoice number",
"Original Invoice":"Invoice number",
"Dispatch Date/Cancellation Date":"Date",
"Entity":"Return Type",
"Product Code":"Product SKU Code",
"Order No":"Sale Order Number",
"Invoice No":"Invoice number",
"Channel Name":"Channel Ledger",
"SKU Code":"Product SKU Code",
"Quantity":"Qty",
"Invoice Total":"Total",
"HSN Code":"Product HSN Code",
"GST Tax Type Code":"Sales Ledger",
"SKU Name":"Product Name",
"Invoice Created Date":"Date"
};

function normalizeSKU(value){

if(!value) return "";

let s = String(value);

s = s.replace(/"/g,'');
s = s.replace(/\s+/g,'');

if(/e/i.test(s)){
let num = Number(s);
if(!isNaN(num)){
s = num.toString();
}
}

return s.toUpperCase();
}

function compileCSV(){

let masterHeader = [];
let compiledRows = [];
mrpMap = {};
missingSKUs = [];

/* PASS 1 — BUILD MRP MAP FROM ITEM MASTER */

filesData.forEach(fileObj=>{

if(!fileObj.config.nameMatch.includes("Item Master")) return;

const parsed = Papa.parse(fileObj.content,{
skipEmptyLines:true,
dynamicTyping:false
});

const rows = parsed.data;

const selectedIndexes = fileObj.config.columns;
const skuCol = selectedIndexes[0];
const mrpCol = selectedIndexes[1];

for(let r=1;r<rows.length;r++){

const sku = rows[r][skuCol];
const mrp = rows[r][mrpCol];

const cleanSKU = normalizeSKU(sku);

if(cleanSKU && mrp){
mrpMap[cleanSKU] = mrp;
}

}

});

console.log("MRP MAP:",mrpMap);

/* PASS 2 — PROCESS OTHER FILES */

filesData.forEach(fileObj=>{

if(fileObj.config.nameMatch.includes("Item Master")) return;

const parsed = Papa.parse(fileObj.content,{
skipEmptyLines:true
});

const rows = parsed.data;

const selectedIndexes = fileObj.config.columns;

const currentHeaders = selectedIndexes.map(i=>{

let header = rows[0][i] || "";

if(headerAliases[header]){
header = headerAliases[header];
}

return header;

});

/* ⭐ FORCE CREATE MRP COLUMN */

if(!masterHeader.includes("MRP")){
masterHeader.push("MRP");
compiledRows.forEach(r=>r.push(""));
}

currentHeaders.forEach(header=>{

if(!masterHeader.includes(header)){
masterHeader.push(header);
compiledRows.forEach(r=>r.push(""));
}

});

for(let r=1;r<rows.length;r++){

let newRow = new Array(masterHeader.length).fill("");

selectedIndexes.forEach((colIndex,idx)=>{

const headerName = currentHeaders[idx];
const masterIndex = masterHeader.indexOf(headerName);

if(masterIndex!==-1){
newRow[masterIndex] = rows[r][colIndex] || "";
}

});

/* APPLY MRP FROM ITEM MASTER */

const skuIndex = masterHeader.indexOf("Product SKU Code");
const mrpIndex = masterHeader.indexOf("MRP");

if(skuIndex !== -1){

const sku = normalizeSKU(newRow[skuIndex]);

if(mrpMap[sku]){
newRow[mrpIndex] = mrpMap[sku];
}else{
missingSKUs.push(sku);
}

}

compiledRows.push(newRow);

}

});

/* ADD TOTAL TAX */

if(!masterHeader.includes("Total Tax")){
masterHeader.push("Total Tax");
}

const igstIndex = masterHeader.indexOf("IGST");
const cgstIndex = masterHeader.indexOf("CGST");
const sgstIndex = masterHeader.indexOf("SGST");
const totalTaxIndex = masterHeader.indexOf("Total Tax");

compiledRows = compiledRows.map(row=>{

let igst = parseFloat(row[igstIndex])||0;
let cgst = parseFloat(row[cgstIndex])||0;
let sgst = parseFloat(row[sgstIndex])||0;

row[totalTaxIndex] = (igst+cgst+sgst).toFixed(2);

return row;

});

/* TOTAL MRP */

if(!masterHeader.includes("Total MRP")){
masterHeader.push("Total MRP");
}

const mrpIndex = masterHeader.indexOf("MRP");
const qtyIndex = masterHeader.indexOf("Qty");
const totalMRPIndex = masterHeader.indexOf("Total MRP");

compiledRows = compiledRows.map(row=>{

let mrp = parseFloat(row[mrpIndex])||0;
let qty = parseFloat(row[qtyIndex])||0;

row[totalMRPIndex] = (mrp*qty).toFixed(2);

return row;

});

/* FINAL CSV */

const finalCSV =
masterHeader.join(',')+'\n'+
compiledRows.map(r=>r.join(',')).join('\n');

console.log("Missing SKUs:",missingSKUs);

downloadCSV(finalCSV);

}

function downloadCSV(content){

const blob = new Blob([content],{type:'text/csv;charset=utf-8;'});
const url = URL.createObjectURL(blob);

const a = document.createElement('a');
a.href = url;
a.download = "compiled.csv";

document.body.appendChild(a);
a.click();
document.body.removeChild(a);

URL.revokeObjectURL(url);

}
