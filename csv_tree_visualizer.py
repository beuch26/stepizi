#!/usr/bin/env python3
"""
Visualiseur d'arbre CSV pour l'architecture de site
Lit un fichier CSV et affiche la structure hiérarchique sous forme d'arbre
"""

import csv
import json
import argparse
from collections import defaultdict
from typing import Dict, List, Set, Any
from urllib.parse import urlparse


class TreeNode:
    """Représente un noeud dans l'arbre"""
    def __init__(self, name: str, data: Dict[str, Any] = None):
        self.name = name
        self.data = data or {}
        self.children = []

    def add_child(self, child: 'TreeNode'):
        """Ajoute un enfant au noeud"""
        self.children.append(child)

    def __repr__(self):
        return f"TreeNode({self.name})"


class CSVTreeVisualizer:
    """Classe principale pour visualiser les structures CSV en arbre"""

    def __init__(self, csv_file: str):
        self.csv_file = csv_file
        self.data = []
        self.load_csv()

    def load_csv(self):
        """Charge le fichier CSV"""
        with open(self.csv_file, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            self.data = list(reader)
        print(f"✓ Chargé {len(self.data)} lignes depuis {self.csv_file}")

    def parse_json_field(self, field: str) -> List[str]:
        """Parse un champ JSON (comme parent)"""
        if not field or field.strip() == '':
            return []
        try:
            return json.loads(field)
        except json.JSONDecodeError:
            return []

    def extract_collection_name(self, url: str) -> str:
        """Extrait le nom de la collection depuis l'URL"""
        if not url:
            return "Sans collection"
        parsed = urlparse(url)
        path_parts = parsed.path.strip('/').split('/')
        if 'collections' in path_parts:
            idx = path_parts.index('collections')
            if idx + 1 < len(path_parts):
                collection = path_parts[idx + 1]
                # Nettoyer le nom
                collection = collection.replace('-', ' ').replace('.atom', '')
                return collection.title()
        return url

    def build_tree_by_collection(self) -> TreeNode:
        """Construit un arbre basé sur principal_collection"""
        root = TreeNode("Site Web")
        collections = defaultdict(list)

        # Grouper par collection
        for row in self.data:
            collection_url = row.get('principal_collection', '').strip()
            collection_name = self.extract_collection_name(collection_url)
            collections[collection_name].append(row)

        # Créer l'arbre
        for collection_name, items in sorted(collections.items()):
            collection_node = TreeNode(f"📁 {collection_name} ({len(items)} produits)")

            for item in items:
                keyword = item.get('keyword', 'Sans titre')
                url = item.get('url', '')
                status = item.get('status', '')
                typology = item.get('typology', '')

                # Créer une représentation du produit
                product_info = f"📄 {keyword}"
                if status:
                    product_info += f" [{status}]"

                product_node = TreeNode(product_info, item)
                collection_node.add_child(product_node)

            root.add_child(collection_node)

        return root

    def build_tree_by_topic(self) -> TreeNode:
        """Construit un arbre basé sur topic"""
        root = TreeNode("Site Web (par Topic)")
        topics = defaultdict(list)

        # Grouper par topic
        for row in self.data:
            topic = row.get('topic', '').strip() or "Sans topic"
            topics[topic].append(row)

        # Créer l'arbre
        for topic_name, items in sorted(topics.items()):
            if topic_name and topic_name != "Sans topic":
                topic_node = TreeNode(f"🏷️  {topic_name.title()} ({len(items)} produits)")
            else:
                topic_node = TreeNode(f"🏷️  {topic_name} ({len(items)} produits)")

            for item in items:
                keyword = item.get('keyword', 'Sans titre')
                status = item.get('status', '')

                product_info = f"📄 {keyword}"
                if status:
                    product_info += f" [{status}]"

                product_node = TreeNode(product_info, item)
                topic_node.add_child(product_node)

            root.add_child(topic_node)

        return root

    def build_tree_by_parent_relationships(self) -> TreeNode:
        """Construit un arbre basé sur les relations parent"""
        root = TreeNode("Site Web (par Relations)")

        # Créer un mapping URL -> items
        url_to_items = defaultdict(list)
        parent_urls = set()

        for row in self.data:
            url = row.get('url', '').strip()
            parents = self.parse_json_field(row.get('parent', ''))

            if url:
                url_to_items[url].append(row)

            # Collecter toutes les URLs parentes
            for parent_url in parents:
                parent_urls.add(parent_url)

        # Identifier les collections (URLs qui sont parents mais pas dans les produits)
        collection_urls = parent_urls - set(url_to_items.keys())

        # Créer des noeuds pour les collections
        collection_nodes = {}
        for coll_url in collection_urls:
            coll_name = self.extract_collection_name(coll_url)
            collection_nodes[coll_url] = TreeNode(f"📁 {coll_name}")

        # Mapper les produits à leurs parents
        products_with_parents = []
        products_without_parents = []

        for row in self.data:
            parents = self.parse_json_field(row.get('parent', ''))
            keyword = row.get('keyword', 'Sans titre')
            status = row.get('status', '')

            product_info = f"📄 {keyword}"
            if status:
                product_info += f" [{status}]"

            product_node = TreeNode(product_info, row)

            if parents:
                products_with_parents.append((product_node, parents))
            else:
                products_without_parents.append(product_node)

        # Ajouter les produits aux collections
        for product_node, parent_urls_list in products_with_parents:
            for parent_url in parent_urls_list:
                if parent_url in collection_nodes:
                    collection_nodes[parent_url].add_child(product_node)

        # Ajouter les collections au root
        for coll_node in collection_nodes.values():
            if coll_node.children:  # Seulement si la collection a des enfants
                root.add_child(coll_node)

        # Ajouter les produits sans parent
        if products_without_parents:
            orphans = TreeNode(f"🔍 Produits sans parent ({len(products_without_parents)})")
            for product_node in products_without_parents:
                orphans.add_child(product_node)
            root.add_child(orphans)

        return root

    def build_statistics_tree(self) -> TreeNode:
        """Construit un arbre avec des statistiques"""
        root = TreeNode("📊 Statistiques du Site")

        # Stats générales
        total = len(self.data)
        stats_node = TreeNode(f"Total: {total} entrées")
        root.add_child(stats_node)

        # Par typologie
        typology_counts = defaultdict(int)
        for row in self.data:
            typology = row.get('typology', 'unknown')
            typology_counts[typology] += 1

        typo_node = TreeNode("Par Typologie")
        for typo, count in sorted(typology_counts.items()):
            typo_node.add_child(TreeNode(f"{typo}: {count}"))
        root.add_child(typo_node)

        # Par statut
        status_counts = defaultdict(int)
        for row in self.data:
            status = row.get('status', 'unknown')
            status_counts[status] += 1

        status_node = TreeNode("Par Statut")
        for status, count in sorted(status_counts.items()):
            status_node.add_child(TreeNode(f"{status}: {count}"))
        root.add_child(status_node)

        # Indexation
        indexed_counts = defaultdict(int)
        for row in self.data:
            indexed = row.get('indexed', 'unknown')
            indexed_counts[indexed] += 1

        indexed_node = TreeNode("Indexation")
        for indexed, count in sorted(indexed_counts.items()):
            indexed_node.add_child(TreeNode(f"{indexed}: {count}"))
        root.add_child(indexed_node)

        return root

    def print_tree(self, node: TreeNode, prefix: str = "", is_last: bool = True):
        """Affiche l'arbre de manière récursive"""
        # Symboles pour l'arbre
        connector = "└── " if is_last else "├── "

        print(prefix + connector + node.name)

        # Préparer le préfixe pour les enfants
        if is_last:
            child_prefix = prefix + "    "
        else:
            child_prefix = prefix + "│   "

        # Afficher les enfants
        for i, child in enumerate(node.children):
            is_last_child = (i == len(node.children) - 1)
            self.print_tree(child, child_prefix, is_last_child)

    def visualize(self, view_type: str = "collection"):
        """Visualise l'arbre selon le type de vue choisi"""
        print(f"\n{'='*80}")

        if view_type == "collection":
            print("VUE PAR COLLECTION")
            tree = self.build_tree_by_collection()
        elif view_type == "topic":
            print("VUE PAR TOPIC")
            tree = self.build_tree_by_topic()
        elif view_type == "parent":
            print("VUE PAR RELATIONS PARENT")
            tree = self.build_tree_by_parent_relationships()
        elif view_type == "stats":
            print("VUE STATISTIQUES")
            tree = self.build_statistics_tree()
        else:
            print(f"Type de vue inconnu: {view_type}")
            return

        print(f"{'='*80}\n")
        self.print_tree(tree)
        print()


def main():
    parser = argparse.ArgumentParser(
        description="Visualiseur d'arbre CSV pour l'architecture de site",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Exemples d'utilisation:
  python csv_tree_visualizer.py data.csv
  python csv_tree_visualizer.py data.csv --view collection
  python csv_tree_visualizer.py data.csv --view topic
  python csv_tree_visualizer.py data.csv --view parent
  python csv_tree_visualizer.py data.csv --view stats
  python csv_tree_visualizer.py data.csv --all
        """
    )

    parser.add_argument('csv_file', help='Chemin vers le fichier CSV')
    parser.add_argument(
        '--view',
        choices=['collection', 'topic', 'parent', 'stats'],
        default='collection',
        help='Type de vue (défaut: collection)'
    )
    parser.add_argument(
        '--all',
        action='store_true',
        help='Afficher toutes les vues'
    )

    args = parser.parse_args()

    try:
        visualizer = CSVTreeVisualizer(args.csv_file)

        if args.all:
            for view in ['collection', 'topic', 'parent', 'stats']:
                visualizer.visualize(view)
        else:
            visualizer.visualize(args.view)

    except FileNotFoundError:
        print(f"❌ Erreur: Fichier '{args.csv_file}' non trouvé")
        return 1
    except Exception as e:
        print(f"❌ Erreur: {e}")
        import traceback
        traceback.print_exc()
        return 1

    return 0


if __name__ == "__main__":
    exit(main())
