from pdf_ingestion import ingest_pdf
from rag_pipeline import RAGPipeline
from paper_generator import generate_paper_sync
import os
from dotenv import load_dotenv
load_dotenv()

# Step 1: Ingest
result = ingest_pdf("C:\\Users\\anike\\OneDrive\\Desktop\\rag-sandbox\\test_paper.pdf")
print(f"Paper ID:     {result['paper_id']}")
print(f"Paper title:  {result['paper_title']}")
print(f"Text chunks:  {len(result['text_chunks'])}")
print(f"Image chunks: {len(result['image_chunks'])}")

# Step 2: Index
rag = RAGPipeline()
rag.index_paper(result)
print(f"\nIndexed into ChromaDB:")
print(f"  Text chunks stored:  {len(result['text_chunks'])}")
print(f"  Image chunks stored: {len(result['image_chunks'])}")

# Step 3: Retrieve
context = rag.retrieve_for_generation("grey wolf optimization for intrusion detection")
print(f"\nText chunks retrieved: {len(context['text_chunks'])}")
print(f"Images retrieved:      {len(context['images'])}")

# Step 4: Full context dump
print("\n--- FULL CONTEXT DUMP ---")
for i, chunk in enumerate(context['text_chunks']):
    print(f"\n[CHUNK {i}]")
    print(chunk['content'])

# Step 5: Generate

print("\n--- GENERATING PAPER ---")
print("This will take 30-60 seconds...\n")

paper = generate_paper_sync(context)
print(paper)

with open("generated_paper.txt", "w", encoding="utf-8") as f:
    f.write(paper)

print("\nSaved to generated_paper.txt")