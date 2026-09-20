"""Type/category breakdown. No writes, no URI printed."""
from __future__ import annotations

import re
from collections import Counter
from pathlib import Path

from pymongo import MongoClient

PROPS = Path(__file__).resolve().parents[1] / "src" / "main" / "resources" / "application.properties"
HOSTS = [
    "ac-r6ckhlx-shard-00-00.1qaeqeq.mongodb.net:27017",
    "ac-r6ckhlx-shard-00-01.1qaeqeq.mongodb.net:27017",
    "ac-r6ckhlx-shard-00-02.1qaeqeq.mongodb.net:27017",
]


def connect():
    text = PROPS.read_text(encoding="utf-8")
    m = re.search(r"spring\.data\.mongodb\.uri=\$\{MONGODB_URI:(.+)\}", text)
    uri = m.group(1).strip()
    um = re.match(r"mongodb\+srv://([^:]+):([^@]+)@[^/]+/([^?]+)", uri)
    user, password, db_name = um.group(1), um.group(2), um.group(3)
    seed = ",".join(HOSTS)
    client = MongoClient(
        f"mongodb://{user}:{password}@{seed}/{db_name}?ssl=true&authSource=admin&retryWrites=true&w=majority",
        serverSelectionTimeoutMS=20000,
        tls=True,
        tlsAllowInvalidCertificates=True,
    )
    client.admin.command("ping")
    return client[db_name]


def main() -> None:
    db = connect()
    col = db["products"]
    types = Counter()
    cats = Counter()
    type_of_deleted = Counter()
    img_stats = {"with_data_url": 0, "with_http": 0, "empty": 0, "max_img_len": 0}
    map_risk = {"variations_not_list": 0, "images_huge": 0, "no_type": 0}

    for d in col.find({}, {"type": 1, "category": 1, "deleted": 1, "images": 1, "variations": 1, "name": 1}):
        t = str(d.get("type") or "").strip() or "(empty)"
        c = str(d.get("category") or "").strip() or "(empty)"
        types[t] += 1
        cats[c] += 1
        if d.get("deleted") is True:
            type_of_deleted[t] += 1
        imgs = d.get("images")
        if not imgs:
            img_stats["empty"] += 1
        elif isinstance(imgs, list) and imgs:
            s = str(imgs[0])
            img_stats["max_img_len"] = max(img_stats["max_img_len"], len(s))
            if s.startswith("data:"):
                img_stats["with_data_url"] += 1
                if len(s) > 500_000:
                    map_risk["images_huge"] += 1
            elif s.startswith("http"):
                img_stats["with_http"] += 1
        vars_ = d.get("variations")
        if vars_ is not None and not isinstance(vars_, list):
            map_risk["variations_not_list"] += 1
        if not t or t == "(empty)":
            map_risk["no_type"] += 1

    print("type_counts", dict(types.most_common()))
    print("category_counts", dict(cats.most_common()))
    print("deleted_by_type", dict(type_of_deleted))
    print("img_stats", img_stats)
    print("map_risk", map_risk)
    print("main_categories", list(db["main_categories"].find({}, {"name": 1, "_id": 0})))
    print("categories", list(db["categories"].find({}, {"name": 1, "parentCategory": 1, "_id": 0})))


if __name__ == "__main__":
    main()
