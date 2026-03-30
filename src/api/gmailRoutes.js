/**
 * Gmail-specific API routes
 */

import { google } from 'googleapis';

// Decode base64url
function decodeBase64(data) {
  if (!data) return '';
  try {
    const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
    const padding = base64.length % 4;
    const paddedBase64 = padding ? base64 + '='.repeat(4 - padding) : base64;
    return Buffer.from(paddedBase64, 'base64').toString('utf-8');
  } catch (error) {
    console.error('Error decoding base64:', error);
    return '';
  }
}

// Extract email body
function getEmailBody(payload) {
  let htmlBody = '';
  let textBody = '';

  const extractParts = (part) => {
    if (part.mimeType === 'text/html' && part.body?.data) {
      htmlBody = decodeBase64(part.body.data);
    } else if (part.mimeType === 'text/plain' && part.body?.data) {
      textBody = decodeBase64(part.body.data);
    }

    if (part.parts) {
      part.parts.forEach(extractParts);
    }
  };

  if (payload.body?.data) {
    if (payload.mimeType === 'text/html') {
      htmlBody = decodeBase64(payload.body.data);
    } else if (payload.mimeType === 'text/plain') {
      textBody = decodeBase64(payload.body.data);
    }
  }

  if (payload.parts) {
    payload.parts.forEach(extractParts);
  }

  return { htmlBody, textBody };
}

export function addGmailRoutes(router, loadCredentialsFromHeader) {
  // Get full email details
  router.get('/gmail/email/:messageId', async (req, res) => {
    try {
      const { messageId } = req.params;
      const result = await loadCredentialsFromHeader(req);
      
      if (!result || result.error === 'REFRESH_FAILED') {
        return res.status(401).json({ 
          error: 'Not authenticated',
          requiresReauth: true
        });
      }

      const gmail = google.gmail({ version: 'v1', auth: result.oauth2Client });
      
      const details = await gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full',
      });

      const headers = details.data.payload.headers;
      const subject = headers.find(h => h.name === 'Subject')?.value || 'No Subject';
      const from = headers.find(h => h.name === 'From')?.value || 'Unknown';
      const to = headers.find(h => h.name === 'To')?.value || '';
      const cc = headers.find(h => h.name === 'Cc')?.value || '';
      const date = headers.find(h => h.name === 'Date')?.value || new Date().toISOString();

      const { htmlBody, textBody } = getEmailBody(details.data.payload);

      const attachments = [];
      const extractAttachments = (part) => {
        if (part.filename && part.body?.attachmentId) {
          attachments.push({
            filename: part.filename,
            mimeType: part.mimeType,
            size: part.body.size,
            attachmentId: part.body.attachmentId
          });
        }
        if (part.parts) {
          part.parts.forEach(extractAttachments);
        }
      };
      if (details.data.payload.parts) {
        details.data.payload.parts.forEach(extractAttachments);
      }

      const email = {
        id: messageId,
        subject,
        from,
        to: to ? to.split(',').map(e => e.trim()) : [],
        cc: cc ? cc.split(',').map(e => e.trim()) : [],
        date: new Date(date).toISOString(),
        snippet: details.data.snippet,
        htmlBody,
        textBody,
        attachments,
        labels: details.data.labelIds || []
      };

      if (result.newCredentials) {
        res.set('x-gmail-token-refreshed', JSON.stringify(result.newCredentials));
      }
      
      res.json({ email });
    } catch (error) {
      console.error('❌ Gmail API Error:', error.message);
      res.status(500).json({ 
        error: 'Failed to fetch email details',
        message: error.message 
      });
    }
  });

  // Mark email as read
  router.post('/gmail/mark-read', async (req, res) => {
    try {
      const { messageId } = req.body;
      const result = await loadCredentialsFromHeader(req);
      
      if (!result || result.error === 'REFRESH_FAILED') {
        return res.status(401).json({ 
          error: 'Not authenticated',
          requiresReauth: true
        });
      }

      const gmail = google.gmail({ version: 'v1', auth: result.oauth2Client });
      
      await gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        requestBody: {
          removeLabelIds: ['UNREAD'],
        },
      });

      res.json({ success: true });
    } catch (error) {
      console.error('Error marking email as read:', error);
      res.status(500).json({ 
        error: 'Failed to mark email as read',
        message: error.message 
      });
    }
  });

  // Download attachment
  router.get('/gmail/attachment/:messageId/:attachmentId', async (req, res) => {
    try {
      const { messageId, attachmentId } = req.params;
      const result = await loadCredentialsFromHeader(req);
      
      if (!result || result.error === 'REFRESH_FAILED') {
        return res.status(401).json({ 
          error: 'Not authenticated',
          requiresReauth: true
        });
      }

      const gmail = google.gmail({ version: 'v1', auth: result.oauth2Client });
      
      const attachment = await gmail.users.messages.attachments.get({
        userId: 'me',
        messageId: messageId,
        id: attachmentId
      });

      const data = attachment.data.data;
      const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
      const padding = base64.length % 4;
      const paddedBase64 = padding ? base64 + '='.repeat(4 - padding) : base64;
      const buffer = Buffer.from(paddedBase64, 'base64');

      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Length', buffer.length);
      res.send(buffer);
    } catch (error) {
      console.error('❌ Gmail Attachment Error:', error.message);
      res.status(500).json({ 
        error: 'Failed to download attachment',
        message: error.message 
      });
    }
  });
}
