# Festival Management System - Quick Reference

## Quick Start

### 1. Run Database Migration
```sql
-- In Supabase SQL Editor, run:
-- supabase/migrations/004_festivals.sql
```

### 2. Access Festival Management
```
Admin Panel → Festivals → Add Festival
```

### 3. Create a Festival
1. Click "Add Festival" button
2. Fill Step 1: Basic Information
3. Click "Save & Continue"
4. Fill remaining steps (2-10)
5. Review in Step 11
6. Click "Publish Festival"

---

## File Structure

```
src/
├── components/
│   ├── FestivalWizard.tsx (Main wizard)
│   ├── Step1BasicInfo.tsx
│   ├── Step2DatePanchanga.tsx
│   ├── Step3Deity.tsx
│   ├── Step4Story.tsx
│   ├── Step5Puja.tsx
│   ├── Step6Regional.tsx
│   ├── Step7Timings.tsx
│   ├── Step8Media.tsx
│   ├── Step9Notifications.tsx
│   ├── Step10HomeSettings.tsx
│   └── Step11Review.tsx
├── services/
│   ├── festivalService.ts (CRUD operations)
│   └── r2Client.ts (R2 uploads)
├── types.ts (Festival types)
└── views/
    └── FestivalsView.tsx (Festival list & management)

supabase/
└── migrations/
    └── 004_festivals.sql (Database schema)
```

---

## Key Components

### FestivalWizard
- 11-step form wizard
- Progress indicator
- Form state management
- Save Draft / Publish buttons

### FestivalService
- `fetchFestivalList()` - Get paginated list
- `fetchFestivalFull()` - Get full festival with relations
- `createFestival()` - Create new festival
- `updateFestival()` - Update festival
- `deleteFestival()` - Delete festival
- `duplicateFestival()` - Duplicate festival
- `publishFestival()` - Publish festival
- `unpublishFestival()` - Unpublish festival

### R2Client
- `uploadFestivalMediaToR2()` - Upload media files
- `uploadFestivalJsonToR2()` - Upload story/puja JSON
- `deleteFromR2()` - Delete R2 files

---

## Database Tables

| Table | Purpose |
|-------|---------|
| festivals | Core festival data |
| festival_deities | Deity relationships |
| festival_regions | Regional information |
| festival_timings | Muhurat & timings |
| festival_media | Media file references |
| festival_notifications | Push notifications |
| festival_settings | Home page settings |

---

## Wizard Steps

| Step | Purpose | Key Fields |
|------|---------|-----------|
| 1 | Basic Info | Name, Type, Status, Description |
| 2 | Date & Panchanga | Dates, Tithi, Paksha, Nakshatra |
| 3 | Deity | Primary & Associated Deities |
| 4 | Story | Festival Story Sections (JSON) |
| 5 | Puja | Puja Instructions (JSON) |
| 6 | Regional | Regions & Local Names |
| 7 | Timings | Muhurat & Auspicious Times |
| 8 | Media | Images, Audio, Video (R2) |
| 9 | Notifications | Push Notification Config |
| 10 | Home Settings | Display & Featured Settings |
| 11 | Review | Preview & Publish |

---

## Common Operations

### Create Festival
```typescript
const id = await createFestival({
  name: 'Janmashtami',
  festival_type: 'Major Festival',
  status: 'Draft'
});
```

### Update Festival
```typescript
await updateFestival(id, {
  name: 'Updated Name',
  status: 'Published'
});
```

### Upload Media
```typescript
const { key, url } = await uploadFestivalMediaToR2(
  file,
  festivalId,
  'banner'
);
```

### Upload Story JSON
```typescript
const { key, url } = await uploadFestivalJsonToR2(
  { sections: [...] },
  festivalId,
  'story'
);
```

### Fetch Festival List
```typescript
const { data, count } = await fetchFestivalList({
  page: 1,
  limit: 20,
  search: 'Janmashtami',
  status: 'Published'
});
```

### Duplicate Festival
```typescript
const newId = await duplicateFestival(sourceId);
```

### Delete Festival
```typescript
await deleteFestival(id);
```

---

## R2 Folder Structure

```
sanathana-content/festivals/{festival-id}/
├── stories/story.json
├── puja/puja.json
└── media/
    ├── banner.webp
    ├── thumbnail.webp
    └── ...
```

---

## Data Flow

### Create Flow
1. Admin fills wizard steps
2. Click "Publish Festival"
3. Create festival record in Supabase
4. Upload story JSON to R2
5. Upload puja JSON to R2
6. Create deity relationships
7. Create region mappings
8. Create timing records
9. Create notification config
10. Create home settings
11. Festival available to customers

### Edit Flow
1. Admin clicks Edit
2. Wizard loads with existing data
3. Admin modifies fields
4. Click "Save & Continue" or "Publish"
5. Update festival record
6. Update related records
7. Upload new media if changed
8. Delete old media files

### Delete Flow
1. Admin clicks Delete
2. Confirmation dialog
3. Delete festival record (cascades)
4. Delete related records
5. Clean up R2 files (optional)

---

## Validation Rules

### Step 1 (Basic Info)
- ✓ Festival Name required
- ✓ Festival Type required
- ✓ Status required
- ✓ Short Description recommended

### Step 2 (Date & Panchanga)
- ✓ Festival Date recommended
- ✓ Timezone defaults to Asia/Kolkata

### Step 3 (Deity)
- ✓ At least one deity recommended
- ✓ One deity marked as primary

### Step 4 (Story)
- ✓ Sections optional
- ✓ Each section needs title and content

### Step 5 (Puja)
- ✓ Sections optional
- ✓ Each section needs title and content

### Step 6 (Regional)
- ✓ Regions optional
- ✓ Regional names optional

### Step 7 (Timings)
- ✓ All timing fields optional
- ✓ Can be filled manually

### Step 8 (Media)
- ✓ Media optional
- ✓ Festival must be saved first

### Step 9 (Notifications)
- ✓ Notifications optional
- ✓ If enabled, title and message required

### Step 10 (Home Settings)
- ✓ All settings optional
- ✓ Priority defaults to 0

### Step 11 (Review)
- ✓ Review only, no input
- ✓ Shows all entered data

---

## Error Handling

### Upload Errors
- File too large → Show error message
- Invalid file type → Show error message
- Network error → Show error message
- R2 upload failed → Show error message

### Database Errors
- Supabase connection failed → Show error message
- Insert failed → Show error message
- Update failed → Show error message
- Delete failed → Show error message

### Validation Errors
- Required field missing → Show field-level error
- Invalid format → Show error message
- Duplicate name → Show warning

---

## Performance Tips

1. **Pagination**: Use limit=20 for list view
2. **Search**: Index on name, alternate_name
3. **Filters**: Use status, festival_type for quick filtering
4. **Media**: Upload to R2, not Supabase
5. **JSON**: Store large content in R2, not Supabase
6. **Caching**: Cache festival list in frontend
7. **Lazy Load**: Load story/puja JSON on demand

---

## Security Checklist

- ✓ No R2 credentials in frontend
- ✓ Use existing authentication
- ✓ Admin-only operations
- ✓ Confirmation for delete
- ✓ Safe file deletion
- ✓ No orphaned files
- ✓ Proper error handling
- ✓ Input validation

---

## Troubleshooting

### Festival not appearing in list
- Check status (Draft/Published)
- Check filters applied
- Verify database migration ran
- Check Supabase connection

### Media upload failing
- Check R2 credentials
- Check file size
- Check file type
- Check network connection

### Story/Puja not saving
- Check JSON format
- Check R2 permissions
- Check file size
- Check network connection

### Duplicate not working
- Check source festival exists
- Check R2 files accessible
- Check database permissions
- Check network connection

---

## Next Steps

1. Run database migration
2. Test create festival
3. Test edit festival
4. Test delete festival
5. Test duplicate festival
6. Test media uploads
7. Test search and filters
8. Test on mobile devices
9. Deploy to production
10. Monitor for errors

---

## Support

For issues or questions:
1. Check FESTIVAL_IMPLEMENTATION.md for detailed docs
2. Review error messages in console
3. Check Supabase logs
4. Check R2 logs
5. Verify database schema
6. Test with sample data

---

## Version History

- v1.0 - Initial implementation
  - 11-step wizard
  - 7 normalized tables
  - R2 integration
  - Complete CRUD
  - Festival list view
  - Search, filter, pagination
  - Duplicate functionality
  - Safe deletion

---

Last Updated: 2024
