import fs from 'fs';
import path from 'path';
import HTTP_STATUS from './src/shared/constants/httpStatus.js';
import MESSAGES from './src/shared/constants/messages.js';

const messagesFilePath = path.resolve('src/shared/constants/messages.js');
let messagesContent = fs.readFileSync(messagesFilePath, 'utf8');

const statusMap = {};
for (const [key, value] of Object.entries(HTTP_STATUS)) {
    statusMap[value] = `HTTP_STATUS.${key}`;
}

const messageMap = {};
for (const [category, messages] of Object.entries(MESSAGES)) {
    for (const [key, value] of Object.entries(messages)) {
        messageMap[value] = `MESSAGES.${category}.${key}`;
    }
}

if (!MESSAGES.CUSTOM) {
    MESSAGES.CUSTOM = {};
}

const dirsToScan = [
    'src/admin/controllers',
    'src/admin/services',
    'src/shared/controllers',
    'src/shared/services',
    'src/user/controllers',
    'src/user/services'
];

function getAllFiles(dirPath, arrayOfFiles) {
    const files = fs.readdirSync(dirPath);

    arrayOfFiles = arrayOfFiles || [];

    files.forEach(function(file) {
        if (fs.statSync(dirPath + "/" + file).isDirectory()) {
            arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
        } else {
            if (file.endsWith('.js')) {
                arrayOfFiles.push(path.join(dirPath, "/", file));
            }
        }
    });

    return arrayOfFiles;
}

let files = [];
dirsToScan.forEach(dir => {
    if (fs.existsSync(dir)) {
        files = files.concat(getAllFiles(dir));
    }
});

let customCount = 100;
let addedNew = false;
let customBlock = '';

function getOrAddMessage(msg) {
    if (messageMap[msg]) {
        return messageMap[msg];
    }
    // Add to custom
    let keyName = msg.toUpperCase().replace(/[^A-Z0-9]/g, '_').replace(/_{2,}/g, '_');
    if (keyName.startsWith('_')) keyName = keyName.substring(1);
    if (keyName.endsWith('_')) keyName = keyName.substring(0, keyName.length - 1);
    if (!keyName) keyName = `CUSTOM_MSG_${customCount}`;
    
    // ensure unique key
    let originalKey = keyName;
    let suffix = 1;
    while(MESSAGES.CUSTOM[keyName]) {
        if (MESSAGES.CUSTOM[keyName] === msg) break;
        keyName = `${originalKey}_${suffix}`;
        suffix++;
    }

    if (!MESSAGES.CUSTOM[keyName]) {
        MESSAGES.CUSTOM[keyName] = msg;
        messageMap[msg] = `MESSAGES.CUSTOM.${keyName}`;
        customBlock += `    ${keyName}: "${msg.replace(/"/g, '\\"')}",\n`;
        addedNew = true;
    }
    return `MESSAGES.CUSTOM.${keyName}`;
}

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let originalContent = content;

    // Find missing messages
    content = content.replace(/throw new Error\(\s*"([^"]+)"\s*\)/g, (match, msg) => {
        return `throw new Error(${getOrAddMessage(msg)})`;
    });
    content = content.replace(/throw new Error\(\s*'([^']+)'\s*\)/g, (match, msg) => {
        return `throw new Error(${getOrAddMessage(msg)})`;
    });

    // Add imports if modified
    if (content !== originalContent) {
        let hasHttpStatus = content.includes('HTTP_STATUS');
        let hasMessages = content.includes('MESSAGES');
        
        const fileDir = path.dirname(file);
        const constantsDir = path.resolve('src/shared/constants');
        let relativePath = path.relative(fileDir, constantsDir).replace(/\\/g, '/');
        if (!relativePath.startsWith('.')) relativePath = './' + relativePath;

        let importStatements = '';
        if (hasHttpStatus && !content.includes('httpStatus.js')) {
            importStatements += `import HTTP_STATUS from "${relativePath}/httpStatus.js";\n`;
        }
        if (hasMessages && !content.includes('messages.js')) {
            importStatements += `import MESSAGES from "${relativePath}/messages.js";\n`;
        }
        
        if (importStatements) {
            const importMatch = content.match(/import .*?;?\n/g);
            if (importMatch) {
                const lastImport = importMatch[importMatch.length - 1];
                content = content.replace(lastImport, lastImport + importStatements);
            } else {
                content = importStatements + content;
            }
        }

        fs.writeFileSync(file, content, 'utf8');
        console.log(`Updated ${file}`);
    }
});

if (addedNew) {
    if (!messagesContent.includes('CUSTOM: {')) {
        let insertPos = messagesContent.lastIndexOf('}'); // second to last }
        messagesContent = messagesContent.replace(/};\s*export default MESSAGES;/, `  CUSTOM: {\n${customBlock}  }\n};\n\nexport default MESSAGES;`);
    } else {
        // Just append to CUSTOM block
        let customMatch = messagesContent.match(/CUSTOM: \{\n([\s\S]*?)  \}/);
        if (customMatch) {
            let newCustom = customMatch[1] + customBlock;
            messagesContent = messagesContent.replace(/CUSTOM: \{\n[\s\S]*?  \}/, `CUSTOM: {\n${newCustom}  }`);
        }
    }
    fs.writeFileSync(messagesFilePath, messagesContent, 'utf8');
    console.log("Updated messages.js with new custom messages.");
}

console.log("Done");
