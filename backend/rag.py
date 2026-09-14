import os
import pickle
import math
import pandas as pd

import faiss

from sentence_transformers import SentenceTransformer


# =========================================================
# VECTOR STORE CONFIGURATION
# =========================================================

VECTOR_STORE_DIR = "backend/vector_store"

INDEX_PATH = os.path.join(
    VECTOR_STORE_DIR,
    "healthcare.index"
)

DOCUMENTS_PATH = os.path.join(
    VECTOR_STORE_DIR,
    "documents.pkl"
)


# =========================================================
# EMBEDDING MODEL
# =========================================================

# Multilingual model:
# Supports Arabic, English, and other languages.

model = SentenceTransformer(
    "paraphrase-multilingual-MiniLM-L12-v2"
)


# =========================================================
# BUILD DOCUMENT TEXT
# =========================================================

def build_document_text(row):

    fields = [
        "title",
        "content_text",
        "symptoms",
        "treatments",
        "risk_factors",
        "prevention"
    ]

    parts = []

    for field in fields:

        value = row.get(
            field,
            ""
        )

        if pd.notna(value):

            value = str(
                value
            ).strip()

            if value:

                parts.append(
                    value
                )

    return "\n".join(
        parts
    )


# =========================================================
# REBUILD VECTOR STORE
# =========================================================

def rebuild_vector_store(csv_path):

    print("===================================")
    print("Rebuilding healthcare vector store")
    print("===================================")

    # -----------------------------------------------------
    # Load dataset
    # -----------------------------------------------------

    df = pd.read_csv(
        csv_path
    )

    print(
        f"Dataset loaded successfully: "
        f"{len(df)} documents"
    )

    # -----------------------------------------------------
    # Validate dataset
    # -----------------------------------------------------

    if "content_text" not in df.columns:

        raise ValueError(
            "Dataset must contain a "
            "'content_text' column."
        )

    # -----------------------------------------------------
    # Prepare documents
    # -----------------------------------------------------

    documents = []
    texts = []

    for _, row in df.iterrows():

        document = row.to_dict()

        document_text = build_document_text(
            row
        )

        document["search_text"] = (
            document_text
        )

        documents.append(
            document
        )

        texts.append(
            document_text
        )

    # -----------------------------------------------------
    # Create multilingual embeddings
    # -----------------------------------------------------

    print(
        "Creating multilingual embeddings..."
    )

    embeddings = model.encode(
        texts,
        show_progress_bar=True
    )

    embeddings = embeddings.astype(
        "float32"
    )

    # -----------------------------------------------------
    # Normalize embeddings
    # -----------------------------------------------------

    faiss.normalize_L2(
        embeddings
    )

    # -----------------------------------------------------
    # Create FAISS index
    # -----------------------------------------------------

    dimension = embeddings.shape[1]

    index = faiss.IndexFlatIP(
        dimension
    )

    index.add(
        embeddings
    )

    # -----------------------------------------------------
    # Create vector store directory
    # -----------------------------------------------------

    os.makedirs(
        VECTOR_STORE_DIR,
        exist_ok=True
    )

    # -----------------------------------------------------
    # Save FAISS index
    # -----------------------------------------------------

    faiss.write_index(
        index,
        INDEX_PATH
    )

    # -----------------------------------------------------
    # Save documents
    # -----------------------------------------------------

    with open(
        DOCUMENTS_PATH,
        "wb"
    ) as f:

        pickle.dump(
            documents,
            f
        )

    # -----------------------------------------------------
    # Reload vector store
    # -----------------------------------------------------

    reload_vector_store()

    print("===================================")
    print("Vector store rebuilt successfully!")

    print(
        f"Documents: {len(documents)}"
    )

    print(
        f"Embedding dimension: {dimension}"
    )

    print(
        "Embedding model: "
        "paraphrase-multilingual-MiniLM-L12-v2"
    )

    print("===================================")

    return {
        "documents": len(documents),
        "embedding_dimension": dimension
    }


# =========================================================
# LOAD VECTOR STORE
# =========================================================

def load_vector_store():

    if not os.path.exists(
        INDEX_PATH
    ):

        raise FileNotFoundError(
            "FAISS index not found."
        )

    if not os.path.exists(
        DOCUMENTS_PATH
    ):

        raise FileNotFoundError(
            "Documents file not found."
        )

    index = faiss.read_index(
        INDEX_PATH
    )

    with open(
        DOCUMENTS_PATH,
        "rb"
    ) as f:

        documents = pickle.load(
            f
        )

    return index, documents


# =========================================================
# RELOAD VECTOR STORE
# =========================================================

def reload_vector_store():

    global index
    global documents

    index, documents = load_vector_store()

    print(
        "Vector store reloaded into memory!"
    )


# =========================================================
# LOAD VECTOR STORE AT STARTUP
# =========================================================

index, documents = load_vector_store()


# =========================================================
# SEARCH DOCUMENTS
# =========================================================

def search_documents(
    query,
    top_k=3
):
    """
    Search the FAISS vector store and return
    the most relevant healthcare documents.
    """

    # -----------------------------------------------------
    # Validate query
    # -----------------------------------------------------

    if not query or not query.strip():

        return []

    # -----------------------------------------------------
    # Make sure top_k is valid
    # -----------------------------------------------------

    top_k = max(
        1,
        min(
            int(top_k),
            len(documents)
        )
    )

    # -----------------------------------------------------
    # Create multilingual query embedding
    # -----------------------------------------------------

    query_embedding = model.encode(
        [query],
        convert_to_numpy=True
    )

    query_embedding = query_embedding.astype(
        "float32"
    )

    # -----------------------------------------------------
    # Normalize query embedding
    # -----------------------------------------------------

    faiss.normalize_L2(
        query_embedding
    )

    # -----------------------------------------------------
    # Search FAISS
    # -----------------------------------------------------

    scores, indices = index.search(
        query_embedding,
        top_k
    )

    # -----------------------------------------------------
    # Build results
    # -----------------------------------------------------

    results = []

    for score, index_position in zip(
        scores[0],
        indices[0]
    ):

        if index_position < 0:
            continue

        # -------------------------------------------------
        # Clean score
        # -------------------------------------------------

        clean_score = float(
            score
        )

        if not math.isfinite(
            clean_score
        ):

            clean_score = 0.0

        # -------------------------------------------------
        # Get document
        # -------------------------------------------------

        document = documents[
            index_position
        ]

        # -------------------------------------------------
        # Clean NaN values
        # -------------------------------------------------

        cleaned_document = {}

        for key, value in document.items():

            if pd.isna(value):

                cleaned_document[key] = ""

            else:

                cleaned_document[key] = value

        # -------------------------------------------------
        # Add result
        # -------------------------------------------------

        results.append(
            {
                "score": clean_score,
                "document": cleaned_document
            }
        )

    return results