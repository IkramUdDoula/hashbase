# OpenAI Usage Widget

Monitor your OpenAI API usage, token consumption, costs, and available balance in real-time.

## Features

- **Token Usage Statistics** - View total tokens consumed over the last 30 days
- **Cost Tracking** - Monitor your spending with detailed cost breakdowns
- **Available Balance** - See your remaining credits and grant information
- **Request Count** - Track the number of API calls made
- **Daily Usage Trends** - View recent activity with daily breakdowns
- **Model Breakdown** - See which models are consuming the most tokens and costs
- **Auto-Refresh** - Automatically update usage data at configurable intervals
- **Detailed Explorer** - Click any stat card to view comprehensive usage details

## Setup

### 1. Add OpenAI Admin API Key

**Important:** This widget requires an **Admin API key**, not a regular API key.

1. Get an Admin API key:
   - Go to: https://platform.openai.com/settings/organization/admin-keys
   - Click "Create new admin key"
   - Copy the key (starts with `sk-`)

2. Add to Hashbase:
   - Open Settings (gear icon in bottom-right)
   - Go to the **Secrets** tab
   - Add your Admin API key:
     - **Key**: `OPENAI_ADMIN_KEY`
     - **Value**: Your Admin API key
   - Click **Save**

**Note:** Your regular `OPENAI_API_KEY` (for AI Chat widget) remains separate and unchanged.

### 2. Enable the Widget

1. Open Settings → **Widgets** tab
2. Find **OpenAI Usage** in the list
3. Toggle it **ON**
4. The widget will appear on your dashboard

## Usage

### Widget Display

The widget shows four key metrics in a grid:

1. **Total Tokens** - Total tokens consumed (last 30 days)
2. **Total Cost** - Total amount spent in USD
3. **Available Balance** - Remaining credits from grants
4. **API Requests** - Number of API calls made

Below the grid, you'll see recent daily activity showing:
- Date
- Tokens consumed
- Cost for that day

### Explorer View

Click any stat card or the "view detailed breakdown" link to open the explorer, which shows:

- **Summary** - All key metrics at a glance
- **Token Breakdown** - Prompt tokens vs completion tokens
- **Cost by Model** - Which models are costing the most
- **Daily Usage** - Complete 30-day history with charts
- **Subscription Details** - Your plan and limits
- **Credit Grants** - Detailed breakdown of available credits

### Settings

Configure the widget behavior:

- **Auto Refresh** - Enable/disable automatic data updates
- **Refresh Interval** - Set how often to refresh (5m - 1h)
- **Show Usage Chart** - Toggle daily usage visualization
- **Show Cost Breakdown** - Toggle model-by-model cost analysis

## Data Storage

The widget stores the following in localStorage:

- `openai_widget_data` - Cached usage data (for faster loading)
- `openai_widget_settings` - Widget configuration

Both keys are automatically backed up when you:
- Download your config (Settings → Storage)
- Use folder sync
- Export your dashboard settings

## API Information

The widget uses the following OpenAI API endpoints:

- `/v1/usage` - Fetch usage statistics
- `/v1/dashboard/billing/subscription` - Get subscription info
- `/v1/dashboard/billing/credit_grants` - Get credit balance

**Note**: Some API keys may not have access to billing endpoints. If you see errors about billing access, your usage stats will still work, but subscription and credit information may not be available.

## Troubleshooting

### "OpenAI Admin API key not configured"

**Solution**: Add your Admin API key in Settings → Secrets → `OPENAI_ADMIN_KEY` (not `OPENAI_API_KEY`)

### "Invalid OpenAI API key"

**Solution**: Verify your Admin API key is correct and hasn't expired. Get a new Admin key from [OpenAI Admin Keys](https://platform.openai.com/settings/organization/admin-keys).

### "Admin API key required. Regular API keys cannot access usage data."

**Cause**: You're using a regular API key instead of an Admin key.

**Solution**: 
- Regular API keys (`OPENAI_API_KEY`) are for AI Chat widget
- Admin API keys (`OPENAI_ADMIN_KEY`) are required for usage tracking
- Get an Admin key from: https://platform.openai.com/settings/organization/admin-keys

### "Access denied" or "Permission error"

**Cause**: Your API key may not have access to billing/usage endpoints.

**Solution**: 
- Check your API key permissions in OpenAI dashboard
- Some organization keys have restricted access
- Try using a personal API key instead

### No usage data showing

**Possible causes**:
- No API usage in the last 30 days
- API key doesn't have usage tracking enabled
- Network connectivity issues

**Solution**: 
- Make some API calls to generate usage data
- Wait a few minutes for data to propagate
- Check browser console for error messages

### Widget not refreshing

**Solution**:
- Check auto-refresh is enabled in settings
- Manually click the refresh button
- Verify your internet connection
- Check if API key is still valid

## Features in Detail

### Token Tracking

Tracks three types of tokens:
- **Prompt Tokens** - Input tokens sent to the API
- **Completion Tokens** - Output tokens generated by the API
- **Total Tokens** - Sum of prompt and completion tokens

### Cost Calculation

Costs are calculated based on:
- Model used (GPT-4, GPT-3.5, etc.)
- Number of tokens consumed
- OpenAI's pricing for each model

The widget shows:
- Total cost for the period
- Daily cost breakdown
- Cost per model
- Percentage of total cost per model

### Credit Management

If you have credit grants (free credits, promotional credits, etc.), the widget displays:
- Total grant amount
- Amount used
- Amount remaining
- Expiration date

### Auto-Refresh

When enabled, the widget automatically fetches fresh data at your chosen interval:
- **5 minutes** - For active monitoring
- **10 minutes** - Balanced updates
- **15 minutes** - Moderate refresh rate
- **30 minutes** - Default, recommended
- **1 hour** - Minimal API calls

## Privacy & Security

- API keys are stored encrypted in localStorage
- Usage data is cached locally for performance
- No data is sent to third-party servers
- All API calls go directly to OpenAI

## Tips

1. **Monitor Costs** - Check the widget regularly to avoid unexpected charges
2. **Set Limits** - Use OpenAI's dashboard to set spending limits
3. **Track Trends** - Use the daily breakdown to identify usage patterns
4. **Model Optimization** - Use the model breakdown to optimize costs
5. **Credit Tracking** - Keep an eye on credit expiration dates

## Related Widgets

- **AI Chat Widget** - Chat with OpenAI models directly
- **GitHub Commits** - Monitor your development activity
- **Timer Widget** - Track time spent on tasks

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review OpenAI's [API documentation](https://platform.openai.com/docs)
3. Check your API key status in [OpenAI Platform](https://platform.openai.com/api-keys)

## Version History

- **v1.0.0** - Initial release
  - Token usage tracking
  - Cost monitoring
  - Credit balance display
  - Daily usage trends
  - Model breakdown
  - Auto-refresh capability
