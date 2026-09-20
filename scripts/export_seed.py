import json
import re
from pathlib import Path
from pymongo import MongoClient

HOSTS = [
    "ac-r6ckhlx-shard-00-00.1qaeqeq.mongodb.net:27017",
    "ac-r6ckhlx-shard-00-01.1qaeqeq.mongodb.net:27017",
    "ac-r6ckhlx-shard-00-02.1qaeqeq.mongodb.net:27017",
]

def connect():
    user, password, db_name = "fredyramos396_db_user", "thiagogael02", "jyn_store"
    seed = ",".join(HOSTS)
    client = MongoClient(
        f"mongodb://{user}:{password}@{seed}/{db_name}?ssl=true&authSource=admin&retryWrites=true&w=majority",
        serverSelectionTimeoutMS=10000,
        tls=True,
        tlsAllowInvalidCertificates=True,
    )
    return client[db_name]

def export_data():
    db = connect()
    main_cats = list(db['main_categories'].find({}, {'_id': 0}))
    if not main_cats:
        main_cats = [{'name': 'Maquillaje'}, {'name': 'Ropa'}]
        
    cats = list(db['categories'].find({}, {'_id': 0}))
    
    products = []
    fields = {'name': 1, 'description': 1, 'price': 1, 'category': 1, 'type': 1, 'generalStock': 1, 'stock': 1, 'variations': 1, 'images': 1, 'deleted': 1}
    for p in db['products'].find({}, fields):
        if p.get('deleted') is True:
            continue
            
        p_clean = {
            'name': str(p.get('name') or 'Producto'),
            'description': str(p.get('description') or ''),
            'price': float(p.get('price') or 0.0),
            'category': str(p.get('category') or 'General'),
            'type': str(p.get('type') or 'maquillaje'),
            'generalStock': int(p.get('generalStock') or p.get('stock') or 10),
            'variations': p.get('variations') or [],
            'deleted': False,
            'images': []
        }
        
        raw_imgs = p.get('images', [])
        clean_imgs = []
        if isinstance(raw_imgs, list):
            for img in raw_imgs:
                s = str(img)
                if s.startswith('data:') and len(s) > 30000:
                    continue
                clean_imgs.append(s)
        elif raw_imgs:
            s = str(raw_imgs)
            if not (s.startswith('data:') and len(s) > 30000):
                clean_imgs.append(s)
            
        if not clean_imgs:
            if 'ropa' in p_clean['type'].lower():
                clean_imgs.append("https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=600&auto=format&fit=crop")
            else:
                clean_imgs.append("https://images.unsplash.com/photo-1596462502278-27bfdc403348?q=80&w=600&auto=format&fit=crop")
                
        p_clean['images'] = clean_imgs
        products.append(p_clean)
        
    data = {
        'mainCategories': main_cats,
        'categories': cats,
        'products': products
    }
    
    with open('src/main/resources/seed-data.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        
    print(f"SUCCESS: Exported {len(main_cats)} main categories, {len(cats)} categories, {len(products)} products.")

if __name__ == '__main__':
    export_data()
