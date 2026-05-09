#!/bin/bash
P=elitepro-16718
SA=$(gcloud iam service-accounts list --project=$P --format='value(email)' --limit=1)
echo "Granting roles to: $SA"
gcloud projects add-iam-policy-binding $P --member="serviceAccount:$SA" --role=roles/editor
gcloud projects add-iam-policy-binding $P --member="serviceAccount:$SA" --role=roles/iam.serviceAccountUser
echo "All done!"
