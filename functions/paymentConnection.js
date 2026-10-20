// paymentConnections/{trainerId} holds GoCardless's fields at the top level and Stripe's
// under `stripe` (B49). Connecting GoCardless replaces its own fields wholesale — and used to
// replace the whole document, which silently dropped the coach's Stripe link: every Stripe
// event for that coach then matched nobody and was thrown away (B52 security review).
// Every GoCardless write that replaces the connection goes through here.
async function replaceGcConnection(db, trainerId, fields) {
  const ref = db.doc(`paymentConnections/${trainerId}`);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const stripe = snap.exists ? snap.data().stripe : undefined;
    tx.set(ref, stripe ? { ...fields, stripe } : fields);
  });
}

module.exports = { replaceGcConnection };
