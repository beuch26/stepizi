// Global state
let csvData = [];
let currentView = 'collection';
let currentTree = null;

// DOM Elements
const csvFileInput = document.getElementById('csvFile');
const fileNameSpan = document.getElementById('fileName');
const treeContainer = document.getElementById('treeContainer');
const viewButtons = document.querySelectorAll('.view-btn');
const expandAllBtn = document.getElementById('expandAll');
const collapseAllBtn = document.getElementById('collapseAll');
const exportBtn = document.getElementById('exportBtn');
const searchInput = document.getElementById('searchInput');
const clearSearchBtn = document.getElementById('clearSearch');
const statsBar = document.getElementById('statsBar');
const exportModal = document.getElementById('exportModal');
const closeModalBtn = document.getElementById('closeModal');

// Tree Node Class
class TreeNode {
    constructor(name, data = null) {
        this.name = name;
        this.data = data;
        this.children = [];
    }

    addChild(child) {
        this.children.push(child);
    }
}

// CSV Parser
function parseCSV(text) {
    const lines = text.split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    const data = [];

    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;

        const values = parseCSVLine(lines[i]);
        const row = {};

        headers.forEach((header, index) => {
            row[header] = values[index] || '';
        });

        data.push(row);
    }

    return data;
}

function parseCSVLine(line) {
    const values = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            values.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }

    values.push(current.trim());
    return values;
}

// JSON field parser
function parseJSONField(field) {
    if (!field || field.trim() === '') return [];
    try {
        return JSON.parse(field);
    } catch (e) {
        return [];
    }
}

// Extract collection name from URL
function extractCollectionName(url) {
    if (!url) return 'Sans collection';

    try {
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split('/').filter(p => p);

        if (pathParts.includes('collections')) {
            const idx = pathParts.indexOf('collections');
            if (idx + 1 < pathParts.length) {
                const collection = pathParts[idx + 1]
                    .replace(/-/g, ' ')
                    .replace('.atom', '');
                return collection.split(' ')
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(' ');
            }
        }
    } catch (e) {
        return url;
    }

    return url;
}

// Build tree by collection
function buildTreeByCollection(data) {
    const root = new TreeNode('Site Web');
    const collections = {};

    data.forEach(row => {
        const collectionUrl = row.principal_collection || '';
        const collectionName = extractCollectionName(collectionUrl);

        if (!collections[collectionName]) {
            collections[collectionName] = [];
        }
        collections[collectionName].push(row);
    });

    Object.keys(collections).sort().forEach(collectionName => {
        const items = collections[collectionName];
        const collectionNode = new TreeNode(
            `📁 ${collectionName}`,
            { type: 'collection', count: items.length }
        );

        items.forEach(item => {
            const keyword = item.keyword || 'Sans titre';
            const status = item.status || '';
            const searchVolume = item.search_volume || '';
            const typology = item.typology || '';
            const productNode = new TreeNode(
                `📄 ${keyword}`,
                { type: 'product', status: status, searchVolume: searchVolume, typology: typology, item: item }
            );
            collectionNode.addChild(productNode);
        });

        root.addChild(collectionNode);
    });

    return root;
}

// Build tree by topic
function buildTreeByTopic(data) {
    const root = new TreeNode('Site Web (par Topic)');
    const topics = {};

    data.forEach(row => {
        const topic = (row.topic || '').trim() || 'Sans topic';

        if (!topics[topic]) {
            topics[topic] = [];
        }
        topics[topic].push(row);
    });

    Object.keys(topics).sort().forEach(topicName => {
        const items = topics[topicName];
        const displayName = topicName !== 'Sans topic'
            ? topicName.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
            : topicName;

        const topicNode = new TreeNode(
            `🏷️ ${displayName}`,
            { type: 'topic', count: items.length }
        );

        items.forEach(item => {
            const keyword = item.keyword || 'Sans titre';
            const status = item.status || '';
            const searchVolume = item.search_volume || '';
            const typology = item.typology || '';
            const productNode = new TreeNode(
                `📄 ${keyword}`,
                { type: 'product', status: status, searchVolume: searchVolume, typology: typology, item: item }
            );
            topicNode.addChild(productNode);
        });

        root.addChild(topicNode);
    });

    return root;
}

// Build tree by parent relationships
function buildTreeByParent(data) {
    const root = new TreeNode('Site Web (par Relations)');
    const collectionNodes = {};
    const productsWithParents = [];
    const productsWithoutParents = [];

    data.forEach(row => {
        const parents = parseJSONField(row.parent || '');
        const keyword = row.keyword || 'Sans titre';
        const status = row.status || '';
        const searchVolume = row.search_volume || '';
        const typology = row.typology || '';

        const productNode = new TreeNode(
            `📄 ${keyword}`,
            { type: 'product', status: status, searchVolume: searchVolume, typology: typology, item: row }
        );

        if (parents.length > 0) {
            productsWithParents.push({ node: productNode, parents: parents });
        } else {
            productsWithoutParents.push(productNode);
        }
    });

    // Create collection nodes from parent URLs
    productsWithParents.forEach(({ node, parents }) => {
        parents.forEach(parentUrl => {
            if (!collectionNodes[parentUrl]) {
                const collectionName = extractCollectionName(parentUrl);
                collectionNodes[parentUrl] = new TreeNode(
                    `📁 ${collectionName}`,
                    { type: 'collection', url: parentUrl }
                );
            }
            collectionNodes[parentUrl].addChild(node);
        });
    });

    // Add collections to root
    Object.values(collectionNodes).forEach(collectionNode => {
        if (collectionNode.children.length > 0) {
            root.addChild(collectionNode);
        }
    });

    // Add orphans
    if (productsWithoutParents.length > 0) {
        const orphansNode = new TreeNode(
            `🔍 Produits sans parent`,
            { type: 'orphans', count: productsWithoutParents.length }
        );
        productsWithoutParents.forEach(node => orphansNode.addChild(node));
        root.addChild(orphansNode);
    }

    return root;
}

// Build statistics tree
function buildStatsTree(data) {
    const root = new TreeNode('📊 Statistiques du Site');

    // Total
    const totalNode = new TreeNode(`Total: ${data.length} entrées`);
    root.addChild(totalNode);

    // By typology
    const typologyCounts = {};
    data.forEach(row => {
        const typology = row.typology || 'unknown';
        typologyCounts[typology] = (typologyCounts[typology] || 0) + 1;
    });

    const typoNode = new TreeNode('Par Typologie');
    Object.keys(typologyCounts).sort().forEach(typo => {
        typoNode.addChild(new TreeNode(`${typo}: ${typologyCounts[typo]}`));
    });
    root.addChild(typoNode);

    // By status
    const statusCounts = {};
    data.forEach(row => {
        const status = row.status || 'unknown';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    const statusNode = new TreeNode('Par Statut');
    Object.keys(statusCounts).sort().forEach(status => {
        statusNode.addChild(new TreeNode(`${status}: ${statusCounts[status]}`));
    });
    root.addChild(statusNode);

    // By indexed
    const indexedCounts = {};
    data.forEach(row => {
        const indexed = row.indexed || 'unknown';
        indexedCounts[indexed] = (indexedCounts[indexed] || 0) + 1;
    });

    const indexedNode = new TreeNode('Indexation');
    Object.keys(indexedCounts).sort().forEach(indexed => {
        indexedNode.addChild(new TreeNode(`${indexed}: ${indexedCounts[indexed]}`));
    });
    root.addChild(indexedNode);

    // Search Volume Statistics
    const volumeStats = data.filter(row => row.search_volume && row.search_volume.trim() !== '');
    const volumeNode = new TreeNode('Volumes de Recherche');

    volumeNode.addChild(new TreeNode(`Mots-clés avec volume: ${volumeStats.length}`));
    volumeNode.addChild(new TreeNode(`Sans volume: ${data.length - volumeStats.length}`));

    if (volumeStats.length > 0) {
        // Calculate total and average volume
        const volumes = volumeStats.map(row => parseInt(row.search_volume) || 0);
        const totalVolume = volumes.reduce((sum, vol) => sum + vol, 0);
        const avgVolume = Math.round(totalVolume / volumes.length);
        const maxVolume = Math.max(...volumes);
        const minVolume = Math.min(...volumes.filter(v => v > 0));

        volumeNode.addChild(new TreeNode(`Volume total: ${totalVolume.toLocaleString()}`));
        volumeNode.addChild(new TreeNode(`Volume moyen: ${avgVolume.toLocaleString()}`));
        volumeNode.addChild(new TreeNode(`Volume max: ${maxVolume.toLocaleString()}`));
        if (minVolume < Infinity) {
            volumeNode.addChild(new TreeNode(`Volume min: ${minVolume.toLocaleString()}`));
        }
    }

    root.addChild(volumeNode);

    return root;
}

// Render tree to HTML
function renderTree(node, isRoot = true) {
    const div = document.createElement('div');
    div.className = isRoot ? 'tree-node root' : 'tree-node';

    const content = document.createElement('div');
    content.className = 'node-content';

    // Toggle icon
    if (node.children.length > 0) {
        const toggle = document.createElement('span');
        toggle.className = 'toggle-icon';
        toggle.textContent = '▼';
        content.appendChild(toggle);
    } else {
        const spacer = document.createElement('span');
        spacer.className = 'toggle-icon';
        spacer.textContent = '';
        content.appendChild(spacer);
    }

    // Node label
    const label = document.createElement('span');
    label.className = 'node-label';
    label.textContent = node.name;
    content.appendChild(label);

    // Add count badge if applicable
    if (node.data && node.data.count) {
        const count = document.createElement('span');
        count.className = 'node-count';
        count.textContent = `(${node.data.count})`;
        content.appendChild(count);
    }

    // Add typology badge if applicable
    if (node.data && node.data.typology && node.data.typology.trim() !== '') {
        const typology = document.createElement('span');
        typology.className = `node-typology ${node.data.typology}`;
        const typologyLabels = {
            'product': '🛒 Produit',
            'guide': '📖 Guide',
            'category': '📂 Catégorie',
            'blog': '✍️ Blog',
            'landing': '🎯 Landing',
            'service': '⚙️ Service'
        };
        typology.textContent = typologyLabels[node.data.typology] || node.data.typology;
        content.appendChild(typology);
    }

    // Add status badge if applicable
    if (node.data && node.data.status) {
        const status = document.createElement('span');
        status.className = `node-status ${node.data.status}`;
        status.textContent = node.data.status;
        content.appendChild(status);
    }

    // Add search volume badge if applicable
    if (node.data && node.data.searchVolume && node.data.searchVolume.trim() !== '') {
        const volume = document.createElement('span');
        volume.className = 'node-volume';
        volume.textContent = `🔍 ${node.data.searchVolume}`;
        content.appendChild(volume);
    }

    div.appendChild(content);

    // Children
    if (node.children.length > 0) {
        const childrenDiv = document.createElement('div');
        childrenDiv.className = 'node-children';

        node.children.forEach(child => {
            childrenDiv.appendChild(renderTree(child, false));
        });

        div.appendChild(childrenDiv);

        // Toggle functionality
        content.addEventListener('click', () => {
            childrenDiv.classList.toggle('collapsed');
            const toggle = content.querySelector('.toggle-icon');
            toggle.textContent = childrenDiv.classList.contains('collapsed') ? '▶' : '▼';
        });
    }

    return div;
}

// Update statistics bar
function updateStats(data) {
    document.getElementById('totalItems').textContent = data.length;

    const collections = new Set();
    data.forEach(row => {
        const collection = row.principal_collection || row.topic || '';
        if (collection) collections.add(collection);
    });
    document.getElementById('totalCollections').textContent = collections.size;

    const published = data.filter(row => row.status === 'published').length;
    document.getElementById('publishedItems').textContent = published;

    const indexed = data.filter(row => row.indexed === 'true').length;
    document.getElementById('indexedItems').textContent = indexed;

    statsBar.style.display = 'flex';
}

// Visualize tree
function visualizeTree(viewType) {
    if (csvData.length === 0) return;

    let tree;
    switch (viewType) {
        case 'collection':
            tree = buildTreeByCollection(csvData);
            break;
        case 'topic':
            tree = buildTreeByTopic(csvData);
            break;
        case 'parent':
            tree = buildTreeByParent(csvData);
            break;
        case 'stats':
            tree = buildStatsTree(csvData);
            break;
        default:
            tree = buildTreeByCollection(csvData);
    }

    currentTree = tree;
    treeContainer.innerHTML = '';
    treeContainer.appendChild(renderTree(tree));
}

// File upload handler
csvFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    fileNameSpan.textContent = file.name;

    const reader = new FileReader();
    reader.onload = (e) => {
        const text = e.target.result;
        csvData = parseCSV(text);
        updateStats(csvData);
        visualizeTree(currentView);
    };
    reader.readAsText(file);
});

// View selector
viewButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        viewButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentView = btn.dataset.view;
        visualizeTree(currentView);
    });
});

// Expand all
expandAllBtn.addEventListener('click', () => {
    document.querySelectorAll('.node-children').forEach(el => {
        el.classList.remove('collapsed');
    });
    document.querySelectorAll('.toggle-icon').forEach(el => {
        if (el.textContent === '▶') el.textContent = '▼';
    });
});

// Collapse all
collapseAllBtn.addEventListener('click', () => {
    document.querySelectorAll('.node-children').forEach(el => {
        el.classList.add('collapsed');
    });
    document.querySelectorAll('.toggle-icon').forEach(el => {
        if (el.textContent === '▼') el.textContent = '▶';
    });
});

// Search functionality
searchInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    clearSearchBtn.style.display = searchTerm ? 'block' : 'none';

    const nodeContents = document.querySelectorAll('.node-content');
    nodeContents.forEach(content => {
        content.classList.remove('highlighted');
        const text = content.textContent.toLowerCase();
        if (searchTerm && text.includes(searchTerm)) {
            content.classList.add('highlighted');

            // Expand parent nodes
            let parent = content.parentElement;
            while (parent) {
                const children = parent.querySelector('.node-children');
                if (children) {
                    children.classList.remove('collapsed');
                    const toggle = parent.querySelector('.toggle-icon');
                    if (toggle) toggle.textContent = '▼';
                }
                parent = parent.parentElement.closest('.tree-node');
            }
        }
    });
});

clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    clearSearchBtn.style.display = 'none';
    document.querySelectorAll('.node-content').forEach(content => {
        content.classList.remove('highlighted');
    });
});

// Export functionality
exportBtn.addEventListener('click', () => {
    if (csvData.length === 0) {
        alert('Veuillez d\'abord charger un fichier CSV');
        return;
    }
    exportModal.style.display = 'flex';
});

closeModalBtn.addEventListener('click', () => {
    exportModal.style.display = 'none';
});

exportModal.addEventListener('click', (e) => {
    if (e.target === exportModal) {
        exportModal.style.display = 'none';
    }
});

// Export as text
document.getElementById('exportText').addEventListener('click', () => {
    const text = treeToText(currentTree);
    downloadFile('tree.txt', text);
    exportModal.style.display = 'none';
});

// Export as JSON
document.getElementById('exportJSON').addEventListener('click', () => {
    const json = JSON.stringify(currentTree, null, 2);
    downloadFile('tree.json', json);
    exportModal.style.display = 'none';
});

// Export as HTML
document.getElementById('exportHTML').addEventListener('click', () => {
    const html = generateHTMLExport();
    downloadFile('tree.html', html);
    exportModal.style.display = 'none';
});

// Convert tree to text
function treeToText(node, prefix = '', isLast = true) {
    const connector = isLast ? '└── ' : '├── ';
    let result = prefix + connector + node.name + '\n';

    const childPrefix = prefix + (isLast ? '    ' : '│   ');
    node.children.forEach((child, index) => {
        const isLastChild = index === node.children.length - 1;
        result += treeToText(child, childPrefix, isLastChild);
    });

    return result;
}

// Download file
function downloadFile(filename, content) {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

// Generate HTML export
function generateHTMLExport() {
    const treeHTML = treeContainer.innerHTML;
    return `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Arbre CSV Export</title>
    <style>${document.querySelector('style') ? document.querySelector('style').textContent : ''}</style>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div class="container">
        <header>
            <h1>🌳 Arbre CSV - Export</h1>
        </header>
        <div class="tree-container">
            ${treeHTML}
        </div>
    </div>
    <script>
        document.querySelectorAll('.node-content').forEach(content => {
            content.addEventListener('click', () => {
                const children = content.nextElementSibling;
                if (children && children.classList.contains('node-children')) {
                    children.classList.toggle('collapsed');
                    const toggle = content.querySelector('.toggle-icon');
                    toggle.textContent = children.classList.contains('collapsed') ? '▶' : '▼';
                }
            });
        });
    </script>
</body>
</html>`;
}
