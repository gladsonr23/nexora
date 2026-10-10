const express = require('express');

const router = express.Router();
let generatorPromise;

router.post('/generate', async (req, res) => {
  try {
    generatorPromise ||= import('../services/flashloop.mjs');
    const { handleGenerate } = await generatorPromise;
    await handleGenerate(req, res);
  } catch (error) {
    console.error('[flashloop] Could not load card generator:', error);
    res.status(500).json({ error: 'FlashLoop could not start. Please try again.' });
  }
});

module.exports = router;
