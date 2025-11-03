# Explorer Architecture & Button System

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     ExplorerContext                          │
│  - Manages global explorer state                            │
│  - Provides openExplorer() with button config               │
│  - Provides useWidgetExplorer() hook                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Explorer Component                        │
│  - Renders backdrop & slide-in panel                        │
│  - Navigation (prev/next)                                   │
│  - Auto-renders footer buttons (NEW!)                      │
│  - Accepts buttons prop: [{ label, icon, onClick, ... }]   │
└─────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    ▼                   ▼
        ┌───────────────────┐  ┌───────────────────┐
        │  GmailExplorer    │  │ GitHubCommits     │
        │                   │  │ Explorer (NEW!)   │
        │  - Email details  │  │  - Commit details │
        │  - Manual footer  │  │  - Auto buttons   │
        │  - Open in Gmail  │  │  - Open in GitHub │
        └───────────────────┘  └───────────────────┘
                    │                   │
                    └─────────┬─────────┘
                              ▼
                    ┌───────────────────┐
                    │  Widget Component │
                    │  - State mgmt     │
                    │  - Item list      │
                    │  - Opens explorer │
                    └───────────────────┘
```

## Data Flow

### Opening an Explorer with Buttons

```javascript
// 1. Widget Component
const handleCommitClick = (commit) => {
  setSelectedCommitSha(commit.sha);
  setExplorerOpen(true);
};

// 2. Explorer Component receives props
<GitHubCommitsExplorer
  open={explorerOpen}
  commitSha={selectedCommitSha}
  commitList={commits}
  buttons={[...]}  // Can be passed here or in Explorer
/>

// 3. Explorer defines buttons
<Explorer
  open={open}
  title="GitHub Commits"
  buttons={[
    {
      label: 'Open in GitHub',
      icon: ExternalLink,
      onClick: handleOpenInGitHub,
      variant: 'outline'
    }
  ]}
>
  {/* Content */}
</Explorer>

// 4. Explorer auto-renders footer
// No need for manual ExplorerFooter!
```

## Button Configuration Schema

```typescript
interface ExplorerButton {
  label: string;           // Button text
  icon?: LucideIcon;       // Optional icon component
  onClick: () => void;     // Click handler
  variant?: string;        // 'outline' | 'ghost' | 'default'
  size?: string;          // 'sm' | 'md' | 'lg'
  className?: string;     // Additional CSS classes
}
```

## Comparison: Before vs After

### Before (Manual Footer)
```javascript
<Explorer open={open} title="Gmail">
  <ExplorerBody>
    {/* Content */}
  </ExplorerBody>
  
  <ExplorerFooter>
    <Button onClick={handleOpen}>
      <ExternalLink className="h-4 w-4 mr-2" />
      Open in Gmail
    </Button>
  </ExplorerFooter>
</Explorer>
```

### After (Universal Buttons)
```javascript
<Explorer 
  open={open} 
  title="GitHub"
  buttons={[
    { label: 'Open in GitHub', icon: ExternalLink, onClick: handleOpen }
  ]}
>
  <ExplorerBody>
    {/* Content */}
  </ExplorerBody>
  {/* Footer auto-rendered! */}
</Explorer>
```

## GitHub Commits: All Branches Flow

```
User clicks commit in widget
         │
         ▼
┌─────────────────────────────────────────┐
│  GitHubCommitsWidget                    │
│  - Shows commits from all branches      │
│  - Deduplicates by SHA                  │
│  - Sorted by date                       │
└─────────────────────────────────────────┘
         │
         │ handleCommitClick()
         ▼
┌─────────────────────────────────────────┐
│  GitHubCommitsExplorer                  │
│  - Full commit details                  │
│  - Repository info                      │
│  - Author details                       │
│  - Branch name                          │
│  - Status badge                         │
│  - Full message                         │
└─────────────────────────────────────────┘
         │
         │ "Open in GitHub" button
         ▼
┌─────────────────────────────────────────┐
│  GitHub.com                             │
│  - Full commit page                     │
│  - Diff view                            │
│  - Comments                             │
└─────────────────────────────────────────┘
```

## Service Layer: Fetching All Branches

```javascript
fetchAllUserCommits()
  │
  ├─► fetchUserRepositories()
  │   └─► Returns: [repo1, repo2, ...]
  │
  └─► For each repository:
      │
      ├─► fetchRepoBranches(owner, repo)
      │   └─► Returns: [main, develop, feature/x, ...]
      │
      └─► For each branch:
          │
          ├─► Fetch commits for branch
          │   └─► GET /repos/:owner/:repo/commits?sha=:branch
          │
          ├─► Deduplicate by SHA
          │   └─► Set<sha> prevents duplicates
          │
          └─► Add branch name to commit object
              └─► commit.branch = branch.name
```

## Key Features

### 1. Universal Button Support
- ✅ Defined once in ExplorerContext
- ✅ Auto-rendered by Explorer component
- ✅ Consistent styling across all explorers
- ✅ Supports multiple buttons
- ✅ Flexible configuration

### 2. All Branches Support
- ✅ Fetches commits from every branch
- ✅ Deduplicates commits (same SHA in multiple branches)
- ✅ Shows branch name in explorer
- ✅ Maintains chronological order
- ✅ Respects maxCommits limit

### 3. Backward Compatibility
- ✅ Manual ExplorerFooter still works
- ✅ Existing explorers (Gmail) unchanged
- ✅ Optional button configuration
- ✅ No breaking changes

## Usage Examples

### Single Button
```javascript
buttons={[
  { label: 'Open', icon: ExternalLink, onClick: handleOpen }
]}
```

### Multiple Buttons
```javascript
buttons={[
  { label: 'Open', icon: ExternalLink, onClick: handleOpen },
  { label: 'Copy', icon: Copy, onClick: handleCopy },
  { label: 'Share', icon: Share, onClick: handleShare }
]}
```

### Custom Styling
```javascript
buttons={[
  { 
    label: 'Delete', 
    icon: Trash, 
    onClick: handleDelete,
    variant: 'destructive',
    className: 'bg-red-500 hover:bg-red-600'
  }
]}
```

## Migration Guide

### For Existing Explorers
1. **No changes required** - Manual footer still works
2. **Optional migration** - Replace ExplorerFooter with buttons prop
3. **Benefits** - Cleaner code, consistent styling

### For New Explorers
1. Define buttons in Explorer component
2. No need to import ExplorerFooter
3. Automatic rendering and styling

## Performance Considerations

### GitHub API Calls
- **Before**: 1 API call per repository (default branch only)
- **After**: 1 + N API calls per repository (1 for branches, N for commits per branch)
- **Mitigation**: 
  - Deduplication reduces redundant data
  - Respects maxCommits limit
  - Caching can be added in future

### Optimization Opportunities
1. Cache branch lists (rarely change)
2. Parallel API calls for branches
3. Lazy load commit status (on explorer open)
4. Implement pagination for large repos
