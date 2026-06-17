# ERPNext Sync Performance Optimization

## ⚡ Batch Processing Implementation

### Problem (আগে):
- Sequential sync: প্রতিটি log একটার পর একটা sync হত
- 1000 logs = 1000 sequential API calls
- প্রতিটি call ~500ms = **~8-10 minutes total**

### Solution (এখন):
- **Batch parallel processing**: একসাথে multiple logs sync
- 1000 logs, batch size 20 = 50 batches
- প্রতিটি batch parallel-এ 20টি API call
- প্রতিটি batch ~500ms = **~25-30 seconds total** 🚀

### Performance Improvement:
- **15-20x faster** ⚡
- 1000 logs: 10 minutes → 30 seconds
- 5000 logs: 50 minutes → 2-3 minutes

---

## 🔧 Technical Implementation

### Backend (`server/src/services/erpnext.ts`):

```typescript
export async function batchSyncAttendance(
  logIds: string[],
  batchSize: number = 20
): Promise<{ synced: number; failed: number; skipped: number; errors: string[] }>
```

**Features:**
- ✅ Batch processing with configurable batch size (default 20)
- ✅ Parallel processing using `Promise.allSettled()`
- ✅ 100ms delay between batches to prevent rate limiting
- ✅ Error handling per log (one failure doesn't stop others)
- ✅ Detailed logging and progress tracking

### Frontend (`client/src/pages/SyncStatus.tsx`):

**New Controls:**
- 📅 Date range picker (from/to)
- 🔢 Limit control (max logs per sync)
- ⚡ **Batch Size control** (1-50, default 20)
- 🚀 One-click bulk sync button

---

## 📊 Usage Guide

### For Small Data (~100 logs):
```
Batch Size: 10-15
Time: ~5-10 seconds
```

### For Medium Data (~1000 logs):
```
Batch Size: 20 (default)
Time: ~30-40 seconds
```

### For Large Data (~5000 logs):
```
Batch Size: 30-40
Time: ~2-3 minutes
```

### For Very Large Data (~10000 logs):
```
Batch Size: 40-50
Limit: Run in chunks of 2000-3000
Time: ~5-7 minutes per chunk
```

---

## ⚠️ Rate Limiting Considerations

### ERPNext Server Capacity:
- Default batch size (20) is safe for most ERPNext instances
- If you get 429 (Too Many Requests) errors, reduce batch size to 10-15
- 100ms delay between batches helps prevent rate limiting

### Network Considerations:
- Slow network: Use batch size 10-15
- Fast network: Use batch size 30-40
- Monitor sync status table for failed logs

---

## 🎯 Best Practices

### First Time Bulk Sync:
1. Test with small batch first (limit: 100, batch size: 10)
2. Check sync status - verify all synced successfully
3. If successful, run full sync (limit: 1000+, batch size: 20-30)
4. Monitor failed logs and retry if needed

### Daily Operations:
- Automatic sync handles new punches in real-time
- No manual intervention needed
- Failed logs auto-retry
- Use bulk sync only for historical data

### Troubleshooting:
1. **Slow sync?** Increase batch size (30-40)
2. **Many failures?** Decrease batch size (10-15)
3. **Rate limit errors?** Add delay or reduce batch size
4. **Network timeout?** Check ERPNext server connectivity

---

## 📈 Monitoring

### Real-time Monitoring:
- Sync Status page auto-refreshes every 10 seconds
- Recent logs table shows last 50 syncs
- Color-coded status badges (synced/pending/failed/skipped)

### CLI Monitoring:
```bash
# Watch Docker logs
docker logs -f prime-attendance-server-1 | grep erpnext

# Run monitoring script
bash scripts/check-erpnext-sync.sh
```

---

## 🔮 Future Improvements

Potential enhancements:
- [ ] Progress bar for bulk sync
- [ ] Retry failed logs automatically after X minutes
- [ ] Daily scheduled bulk sync via cron
- [ ] Email notification on sync completion
- [ ] Sync analytics dashboard
- [ ] Export sync reports

---

## 📝 Changelog

### v2.0 - Batch Processing (Current)
- ✅ Parallel batch processing (20x faster)
- ✅ Configurable batch size
- ✅ Background processing
- ✅ Enhanced error handling
- ✅ Real-time monitoring

### v1.0 - Sequential Sync (Previous)
- Sequential processing
- One log at a time
- Slow for bulk data

---

Generated: 2026-06-17
