# CSV Tree Visualizer

Visualiseur d'arbre CSV pour l'architecture de site web. Ce programme permet de visualiser la structure hiérarchique de votre site à partir d'un fichier CSV.

## 🎨 Deux Modes d'Utilisation

### 1. Interface Web Visuelle (Recommandé)
Une interface web moderne et interactive avec :
- ✅ Glisser-déposer de fichiers CSV
- ✅ Basculement entre différentes vues en un clic
- ✅ Recherche en temps réel
- ✅ Déplier/Replier les nœuds
- ✅ Export en multiples formats (TXT, JSON, HTML)
- ✅ Statistiques en temps réel
- ✅ Design moderne et responsive

### 2. Interface Ligne de Commande
Programme Python pour une utilisation en terminal

## Fonctionnalités

Le programme offre **4 vues différentes** pour analyser votre architecture:

### 1. Vue par Collection (défaut)
Organise les produits par leur collection principale (`principal_collection`)

### 2. Vue par Topic
Groupe les produits par leur topic/catégorie

### 3. Vue par Relations Parent
Affiche la hiérarchie basée sur les relations parent-enfant (colonne `parent`)

### 4. Vue Statistiques
Affiche des statistiques sur votre contenu (typologie, statut, indexation)

## 🚀 Démarrage Rapide

### Interface Web (Recommandé)

1. Ouvrez simplement `index.html` dans votre navigateur
2. Glissez-déposez votre fichier CSV ou cliquez sur "Choisir un fichier CSV"
3. Explorez vos données avec les différentes vues !

**Aucune installation requise** - Fonctionne entièrement dans le navigateur.

Vous pouvez aussi lancer un serveur local :
```bash
# Avec Python
python3 -m http.server 8000

# Puis ouvrez http://localhost:8000 dans votre navigateur
```

## Installation (CLI)

Aucune dépendance externe requise ! Le programme utilise uniquement la bibliothèque standard Python.

```bash
# Rendre le script exécutable (optionnel)
chmod +x csv_tree_visualizer.py
```

## Utilisation

### Utilisation basique
```bash
python3 csv_tree_visualizer.py votre_fichier.csv
```

### Choisir une vue spécifique
```bash
# Vue par collection (défaut)
python3 csv_tree_visualizer.py votre_fichier.csv --view collection

# Vue par topic
python3 csv_tree_visualizer.py votre_fichier.csv --view topic

# Vue par relations parent
python3 csv_tree_visualizer.py votre_fichier.csv --view parent

# Vue statistiques
python3 csv_tree_visualizer.py votre_fichier.csv --view stats
```

### Afficher toutes les vues
```bash
python3 csv_tree_visualizer.py votre_fichier.csv --all
```

## Format du fichier CSV

Le programme s'attend à un fichier CSV avec les colonnes suivantes:

- `id`: Identifiant unique
- `keyword`: Mot-clé/titre du produit
- `url`: URL du produit
- `typology`: Type de contenu (product, category, etc.)
- `status`: Statut (published, draft, etc.)
- `indexed`: Si la page est indexée (true/false)
- `parent`: Relations parentes (format JSON array)
- `principal_collection`: URL de la collection principale
- `topic`: Catégorie/topic

### Exemple de données CSV

```csv
id,keyword,url,typology,status,indexed,parent,principal_collection,topic
1,Mon Produit,https://site.com/products/mon-produit,product,published,true,"[""https://site.com/collections/categorie""]",https://site.com/collections/categorie,categorie
```

## Exemple de sortie

### Vue par Collection
```
Site Web
├── 📁 Sac A Langer (2 produits)
│   ├── 📄 sac à langer sac à dos [published]
│   └── 📄 sac a langer sac a main [published]
├── 📁 Pochettes (1 produits)
│   └── 📄 pochette crème [published]
└── 📁 Tapis Bebe (1 produits)
    └── 📄 tapis à langer [published]
```

### Vue Statistiques
```
📊 Statistiques du Site
├── Total: 8 entrées
├── Par Typologie
│   └── product: 8
├── Par Statut
│   └── published: 8
└── Indexation
    └── true: 8
```

## Options de ligne de commande

```
usage: csv_tree_visualizer.py [-h] [--view {collection,topic,parent,stats}] [--all] csv_file

Arguments:
  csv_file              Chemin vers le fichier CSV

Options:
  -h, --help            Afficher l'aide
  --view {collection,topic,parent,stats}
                        Type de vue (défaut: collection)
  --all                 Afficher toutes les vues
```

## Fichier d'exemple

Un fichier d'exemple `sample_data.csv` est fourni pour tester le programme:

```bash
python3 csv_tree_visualizer.py sample_data.csv --all
```

## Personnalisation

Le code est structuré de manière modulaire et peut être facilement étendu pour:
- Ajouter de nouvelles vues
- Personnaliser l'affichage
- Exporter vers d'autres formats (JSON, HTML, etc.)

## Structure du Projet

### Fichiers Interface Web
- **`index.html`** - Interface web principale
- **`style.css`** - Styles CSS modernes et responsive
- **`app.js`** - Logique JavaScript pour le parsing CSV et la visualisation

### Fichiers CLI
- **`csv_tree_visualizer.py`** - Programme Python en ligne de commande
  - `TreeNode`: Classe représentant un nœud dans l'arbre
  - `CSVTreeVisualizer`: Classe principale contenant toutes les méthodes de visualisation
    - `load_csv()`: Charge le fichier CSV
    - `build_tree_by_collection()`: Construit l'arbre par collection
    - `build_tree_by_topic()`: Construit l'arbre par topic
    - `build_tree_by_parent_relationships()`: Construit l'arbre par relations parent
    - `build_statistics_tree()`: Génère les statistiques
    - `print_tree()`: Affiche l'arbre de manière récursive

### Données d'exemple
- **`sample_data.csv`** - Fichier CSV d'exemple pour tester l'application

## Captures d'écran

L'interface web inclut :
- 🎨 Design moderne avec dégradé violet
- 📊 Barre de statistiques en temps réel
- 🔍 Recherche avec surlignage
- 💾 Export multiples formats
- 📱 Responsive pour mobile et desktop

## Licence

Ce projet est libre d'utilisation.
