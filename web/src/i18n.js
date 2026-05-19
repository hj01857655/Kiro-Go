export const messages = {
  en: {
    // Common
    common: {
      confirm: 'Confirm',
      cancel: 'Cancel',
      close: 'Close',
      save: 'Save',
      delete: 'Delete',
      edit: 'Edit',
      add: 'Add',
      refresh: 'Refresh',
      test: 'Test',
      enable: 'Enable',
      disable: 'Disable',
      import: 'Import',
      export: 'Export',
      loading: 'Loading...',
      search: 'Search',
      filter: 'Filter',
      sort: 'Sort',
      details: 'Details',
      collapse: 'Collapse',
      yes: 'Yes',
      no: 'No',
      none: 'None',
      all: 'All',
      unknown: 'Unknown'
    },

    // Login
    login: {
      title: 'Kiro-Go',
      subtitle: 'Admin Panel',
      password: 'Password',
      passwordPlaceholder: 'Enter admin password',
      loginButton: 'Login',
      invalidPassword: 'Invalid password',
      logout: 'Logout'
    },

    // Navigation
    nav: {
      accounts: 'Accounts',
      apikeys: 'API Keys',
      auditlogs: 'Audit Logs',
      settings: 'Settings',
      stats: 'Statistics'
    },

    // Accounts Panel
    accounts: {
      title: 'Accounts',
      addAccount: 'Add Account',
      importAccounts: 'Import',
      exportAccounts: 'Export',
      refreshAll: 'Refresh All',
      searchPlaceholder: 'Search by email or nickname...',

      // Stats
      total: 'Total',
      enabled: 'Enabled',
      disabled: 'Disabled',
      proPlus: 'Pro+',
      autoRefresh: 'Auto Refresh (30s)',

      // Filters
      allTypes: 'All Types',
      free: 'Free',
      pro: 'Pro',
      proPlus: 'Pro Plus',
      power: 'Power',
      allStatus: 'All Status',
      sortByEmail: 'Sort by Email',
      sortByUsage: 'Sort by Usage',
      sortByType: 'Sort by Type',
      sortByStatus: 'Sort by Status',

      // Batch Actions
      selected: 'selected',
      testSelected: 'Test Selected',
      enableSelected: 'Enable Selected',
      disableSelected: 'Disable Selected',
      deleteSelected: 'Delete Selected',
      clearSelection: 'Clear Selection',

      // Account Card
      email: 'Email',
      usage: 'Usage',
      status: 'Status',
      testing: 'Testing...',

      // Modals
      addAccountTitle: 'Add Account',
      editAccountTitle: 'Edit Account',
      importAccountsTitle: 'Import Accounts',
      accountDetailsTitle: 'Account Details',

      // Auth Methods
      manualToken: 'Manual Token',
      iamSSO: 'IAM SSO',
      builderID: 'Builder ID',
      ssoToken: 'SSO Token',
      credentialsJson: 'Credentials JSON',

      // Form Fields
      accessToken: 'Access Token',
      refreshToken: 'Refresh Token',
      region: 'Region',
      nickname: 'Nickname',
      weight: 'Weight',
      allowOverage: 'Allow Overage',
      overageWeight: 'Overage Weight',
      overageEnabled: 'Overage Billing',
      overageInformation: 'Overage Information',
      currentOverages: 'Current Overages',
      overageCap: 'Overage Cap',
      overageCharges: 'Overage Charges',
      overageRate: 'Overage Rate',
      confirmEnableOverage: 'Enable overage billing? You will be charged for usage beyond the limit.',
      confirmDisableOverage: 'Disable overage billing? Requests will be blocked after reaching the limit.',
      overageToggleFailed: 'Failed to toggle overage status',
      subscriptionInformation: 'Subscription Information',
      subscriptionTitle: 'Subscription Title',
      overageCapability: 'Overage Capability',
      overageSupported: 'Overage Supported',
      quotaUsage: 'Quota Usage',
      resetDate: 'Reset Date',
      remaining: 'Remaining',
      overageControl: 'Overage Control',
      disableOverage: 'Disable Overage',
      enableOverage: 'Enable Overage',
      overageDisabledWarning: 'Overage billing is disabled. Requests will be blocked when quota is exhausted.',
      overageActive: 'Overage Active',
      overageUsage: 'Overage Usage',
      loadBalancing: 'Load Balancing',
      userId: 'User ID',
      proxyURL: 'Proxy URL',
      machineId: 'Machine ID',

      // Placeholders
      enterAccessToken: 'Enter access token',
      enterRefreshToken: 'Enter refresh token',
      enterNickname: 'Enter nickname',
      enterEmail: 'Enter email',
      enterNewAccessToken: 'Enter new access token (optional)',
      enterNewRefreshToken: 'Enter new refresh token (optional)',
      enterMachineId: 'Machine ID',

      // Modal titles and descriptions
      addAccountSubtitle: 'Choose an authentication method to add a new account',
      authenticationMethod: 'Authentication Method',
      manuallyEnterTokens: 'Manually enter access and refresh tokens',

      // Edit Account
      editAccountTitle: 'Edit Account',
      basicSettings: 'Basic Settings',
      tokenSettings: 'Token Settings',
      advancedSettings: 'Advanced Settings',
      weightLoadBalancing: 'Weight (Load Balancing)',
      weightHelp: 'Higher weight = more requests. Default: 1',
      allowOverageUsage: 'Allow Overage Usage',
      allowOverageHelp: 'Continue using this account even when quota is exceeded',
      overageWeightLabel: 'Overage Weight',
      overageWeightHelp: 'Weight when over quota. Default: 1',
      proxyURLOptional: 'Proxy URL (Optional)',
      proxyURLHelp: 'Account-specific proxy. Leave empty to use global proxy',
      machineIdLabel: 'Machine ID',
      machineIdHelp: 'Device identifier for this account',
      cancel: 'Cancel',
      save: 'Save',

      // IAM SSO Flow
      iamSsoDescription: 'Login with AWS IAM Identity Center (Organization Account)',
      ssoTokenDescription: 'Import account using SSO token from AWS CLI or SDK',
      credentialsDescription: 'Import account using credentials JSON file',
      startUrl: 'Start URL',
      startUrlPlaceholder: 'https://your-org.awsapps.com/start',
      startUrlHelp: 'Your AWS IAM Identity Center start URL',
      starting: 'Starting...',
      startSsoLogin: 'Start SSO Login',
      ssoStep1Title: 'Step 1: Authorize in Browser',
      ssoStep1Description: 'Click the button below to open the authorization page in your browser:',
      openAuthPage: 'Open Authorization Page',
      ssoStep2Title: 'Step 2: Complete Authorization',
      ssoStep2Description: 'After authorizing, copy the callback URL from your browser and paste it here:',
      callbackUrl: 'Callback URL',
      callbackUrlPlaceholder: 'Paste the callback URL here',
      callbackUrlHelp: 'The URL should start with http://127.0.0.1:...',
      completing: 'Completing...',
      completeLogin: 'Complete Login',
      cancelSsoLogin: 'Cancel SSO Login',

      // Builder ID Flow
      builderIdDescription: 'Login with AWS Builder ID (Personal Account)',
      startBuilderIdLogin: 'Start Builder ID Login',
      deviceAuthTitle: 'Device Authorization',
      deviceAuthDescription: 'Visit the following URL in your browser and enter the code:',
      verificationUrl: 'Verification URL',
      userCode: 'User Code',
      waitingForAuth: 'Waiting for authorization...',
      codeExpiresIn: 'Code expires in {seconds} seconds',
      cancelBuilderIdLogin: 'Cancel Builder ID Login',

      // Import Modal
      importMethod: 'Import Method',
      ssoTokenTab: 'SSO Token',
      credentialsJsonTab: 'Credentials JSON',
      ssoTokensLabel: 'SSO Token(s)',
      ssoTokensPlaceholder: 'Paste SSO tokens here (one per line)',
      ssoTokensHelp: 'Enter one or more SSO tokens, one per line',
      credentialsJsonLabel: 'Credentials JSON',
      credentialsJsonPlaceholder: 'Paste credentials JSON here, e.g.:\n{\n  "accessToken": "...",\n  "refreshToken": "...",\n  "clientId": "...",\n  "clientSecret": "...",\n  "region": "us-east-1"\n}',
      credentialsJsonHelp: 'Paste the complete credentials JSON object',
      importing: 'Importing...',
      importResultsTitle: 'Import Results',
      imported: 'imported',
      failed: 'failed',

      // Region Options
      regionUsEast1: 'US East (N. Virginia)',
      regionUsWest2: 'US West (Oregon)',
      regionEuWest1: 'EU (Ireland)',
      regionApSoutheast1: 'Asia Pacific (Singapore)',

      // Messages
      accountAdded: 'Account added successfully',
      accountUpdated: 'Account updated successfully',
      accountDeleted: 'Account deleted successfully',
      accountsRefreshed: 'All accounts refreshed successfully',
      accountsExported: 'Accounts exported successfully',
      accountsImported: 'account(s) imported successfully',
      testSuccessful: 'Test successful!',
      testFailed: 'Test Failed',

      // Error messages
      failedToAddAccount: 'Failed to add account',
      failedToUpdateAccount: 'Failed to update account',
      failedToDeleteAccount: 'Failed to delete account',
      failedToRefreshAccount: 'Failed to refresh account',
      failedToRefreshAccounts: 'Failed to refresh accounts',
      failedToUpdateAccountStatus: 'Failed to update account status',
      failedToExportAccounts: 'Failed to export accounts',
      failedToImportSsoTokens: 'Failed to import SSO tokens',
      failedToImportCredentials: 'Failed to import credentials',
      failedToLoadAccountDetails: 'Failed to load account details',
      failedToRefreshModels: 'Failed to refresh models',

      // Toast messages
      accountRefreshedSuccessfully: 'Account refreshed successfully',
      accountsEnabledSuccessfully: 'Accounts enabled successfully',
      accountsDisabledSuccessfully: 'Accounts disabled successfully',
      accountsDeletedSuccessfully: 'Accounts deleted successfully',
      credentialsImportedSuccessfully: 'Credentials imported successfully',
      modelsRefreshedSuccessfully: 'Models refreshed successfully',
      copiedToClipboard: 'Copied to clipboard',
      failedToCopyToClipboard: 'Failed to copy to clipboard',

      // Batch operations
      batchTestFailed: 'Batch test failed',
      allAccountsTestedSuccessfully: 'All {count} account(s) tested successfully',
      batchTestPartialSuccess: '{success} passed, {failed} failed',
      allAccountsFailed: 'All {count} account(s) failed',
      batchTestComplete: 'Batch Test Complete',
      accountTest: 'Account Test',

      // SSO/Builder ID
      ssoLoginStarted: 'SSO login started. Please authorize in your browser.',
      failedToStartSsoLogin: 'Failed to start SSO login',
      failedToCompleteSsoLogin: 'Failed to complete SSO login',
      accountAddedViaSso: 'Account added successfully via IAM SSO',
      builderIdLoginStarted: 'Builder ID login started. Please authorize in your browser.',
      failedToStartBuilderIdLogin: 'Failed to start Builder ID login',
      accountAddedViaBuilderID: 'Account added successfully via Builder ID',
      builderIdAuthExpired: 'Builder ID authorization expired. Please try again.',
      builderIdAuthDenied: 'Builder ID authorization was denied.',
      retryBuilderIdLogin: 'Retry Builder ID Login',

      // Validation messages
      pleaseEnterSsoToken: 'Please enter at least one SSO token',
      pleaseEnterCredentialsJson: 'Please enter credentials JSON',
      invalidJsonFormat: 'Invalid JSON format',
      unknownError: 'Unknown error',
      importFailed: 'Import failed',

      // Confirmations
      deleteConfirmTitle: 'Delete Account',
      deleteConfirmMessage: 'Are you sure you want to delete this account? This action cannot be undone.',
      batchDeleteConfirmTitle: 'Delete Accounts',
      batchDeleteConfirmMessage: 'Delete {count} selected account(s)? This action cannot be undone.',
      batchEnableConfirmTitle: 'Enable Accounts',
      batchEnableConfirmMessage: 'Enable {count} selected account(s)?',
      batchDisableConfirmTitle: 'Disable Accounts',
      batchDisableConfirmMessage: 'Disable {count} selected account(s)?',
      batchTestConfirmTitle: 'Test Accounts',
      batchTestConfirmMessage: 'Test {count} selected account(s)? This will send a test request to each account.',

      // Empty States
      noAccounts: 'No accounts found matching your filters',
      noModels: 'No models available. Click refresh to load models.',

      // Details
      basicInformation: 'Basic Information',
      usageInformation: 'Usage Information',
      statistics: 'Statistics',
      advancedSettings: 'Advanced Settings',
      supportedModels: 'Supported Models',
      refreshModels: 'Refresh Models',
      refreshingModels: 'Refreshing...',
      subscriptionType: 'Subscription',
      authMethod: 'Auth Method',
      currentUsage: 'Current Usage',
      usageLimit: 'Usage Limit',
      usagePercentage: 'Usage Percentage',
      totalRequests: 'Total Requests',
      errorCount: 'Error Count',
      totalTokens: 'Total Tokens',
      lastUsed: 'Last Used',
      never: 'Never'
    },

    // Settings Panel
    settings: {
      title: 'Settings',

      // Basic Settings
      basicSettings: 'Basic Settings',
      serverPort: 'Server Port',
      serverHost: 'Server Host',
      adminPassword: 'Admin Password',
      adminPasswordPlaceholder: 'Enter new password',
      apiKey: 'Global Access Key (Optional)',
      apiKeyPlaceholder: 'Leave empty to disable',
      apiKeyHelp: 'Require a global access key for /v1/messages and /v1/chat/completions endpoints',
      requireApiKey: 'Require Global Access Key',

      // Proxy Settings
      proxySettings: 'Proxy Settings',
      globalProxyURL: 'Global Proxy URL',
      proxyURL: 'Proxy URL',
      proxyURLPlaceholder: 'http://proxy:port or socks5://proxy:port',
      proxyURLHelp: 'Leave empty to disable. Format: http://host:port or socks5://host:port',

      // Thinking Configuration
      thinkingConfiguration: 'Thinking Configuration',
      thinkingSuffix: 'Thinking Suffix',
      thinkingSuffixPlaceholder: '-thinking',
      thinkingSuffixHelp: 'Append to model name to enable extended thinking (e.g., claude-sonnet-4-thinking)',
      openaiFormat: 'OpenAI Format',
      claudeFormat: 'Claude Format',
      formatNone: 'None',

      // Endpoint Settings
      endpointSettings: 'Kiro Endpoint Settings',
      preferredEndpoint: 'Preferred Endpoint',
      endpointAuto: 'Auto (try all)',
      endpointKiro: 'Kiro IDE',
      endpointCodewhisperer: 'CodeWhisperer',
      endpointAmazonq: 'Amazon Q',
      enableFallback: 'Enable Fallback',
      enableFallbackHelp: 'Try other endpoints if preferred one fails',

      // Prompt Filtering
      promptFiltering: 'Prompt Filtering',
      filterClaudeCode: 'Replace Claude Code CLI system prompts',
      filterClaudeCodeHelp: 'Detects Claude Code built-in system prompts and replaces them with a compact backend prompt',
      filterEnvNoise: 'Strip environment metadata',
      filterEnvNoiseHelp: 'Remove git status, recent commits, environment sections from prompts',
      filterStripBoundaries: 'Remove prompt boundaries',
      filterStripBoundariesHelp: 'Strip --- SYSTEM PROMPT --- markers',

      // Custom Filter Rules
      customFilterRules: 'Custom Filter Rules',
      ruleType: 'Type',
      ruleTypeRegex: 'Regex Replace',
      ruleTypeLinesContaining: 'Remove Lines Containing',
      matchPattern: 'Match Pattern',
      matchPatternPlaceholder: 'Pattern to match',
      replaceWith: 'Replace With',
      replaceWithPlaceholder: 'Replacement text',
      removeRule: 'Remove',
      addRule: '+ Add Rule',

      // Actions
      saveSettings: 'Save All Settings',
      saving: 'Saving...',
      reset: 'Reset',
      settingsSaved: 'Settings saved successfully',
      settingsFailed: 'Failed to save settings'
    },

    // Stats Panel
    stats: {
      title: 'Statistics',
      resetStats: 'Reset Stats',
      resetConfirmTitle: 'Reset Statistics',
      resetConfirmMessage: 'Reset all statistics? This action cannot be undone and will clear all historical data.',
      statsReset: 'Statistics reset successfully',
      failedToResetStats: 'Failed to reset statistics',

      // Sections
      accountsSection: 'Accounts',
      requestsSection: 'Requests',
      usageSection: 'Usage',

      // Metrics
      totalAccounts: 'Total Accounts',
      available: 'Available',
      unavailable: 'Unavailable',
      totalRequests: 'Total Requests',
      successful: 'Successful',
      failed: 'Failed',
      successRate: 'Success Rate',
      totalTokens: 'Total Tokens',
      totalCredits: 'Total Credits',
      uptime: 'Uptime',

      // Charts
      successRateTrend: 'Success Rate Trend',
      accountDistribution: 'Account Distribution',
      last24Hours: 'Last 24 Hours',
      bySubscriptionType: 'By Subscription Type'
    },

    // API Keys
    apiKeys: {
      title: 'API Keys',
      createKey: 'Create API Key',
      editKey: 'Edit API Key',
      description: 'Manage API keys for conversation endpoints: /v1/messages, /v1/chat/completions, /v1/messages/count_tokens',
      securityNote: 'Keep your API keys secure. Do not share them in public repositories or client-side code.',
      noKeys: 'No API keys found. Create your first key to get started.',
      createFirstKey: 'Create First Key',
      keyId: 'Key ID',
      status: 'Status',
      active: 'Active',
      inactive: 'Inactive',
      createdAt: 'Created',
      lastUsed: 'Last Used',
      expiresAt: 'Expires',
      usageCount: 'Usage Count',
      permissions: 'Permissions',
      keyName: 'Key Name',
      keyNamePlaceholder: 'e.g., Production API Key',
      keyNameHelp: 'A descriptive name to identify this key',
      neverExpires: 'Never Expires',
      expires7Days: '7 Days',
      expires30Days: '30 Days',
      expires90Days: '90 Days',
      expires1Year: '1 Year',
      permissionsHelp: 'Select which operations this key can perform',
      enableImmediately: 'Enable immediately',
      keyCreated: 'API Key Created',
      keyCreatedMessage: 'Your API key has been created successfully. Copy it now - you won\'t be able to see it again!',
      yourApiKey: 'Your API Key',
      copy: 'Copy',
      copied: 'Copied!',
      copyWarning: 'Make sure to copy your API key now. You won\'t be able to see it again!',
      keyUpdated: 'API key updated successfully',
      keyDeleted: 'API key deleted successfully',
      keyEnabled: 'API key enabled',
      keyDisabled: 'API key disabled',
      keyCopied: 'API key copied to clipboard',
      saveFailed: 'Failed to save API key',
      failedToUpdateKeyStatus: 'Failed to update key status',
      failedToDeleteKey: 'Failed to delete key',
      deleteConfirmTitle: 'Delete API Key',
      deleteConfirmMessage: 'Are you sure you want to delete this API key? This action cannot be undone and will immediately revoke access.',
      permMessagesRead: 'Read Messages',
      permMessagesWrite: 'Send Messages',
      permAccountsRead: 'Read Accounts',
      permAccountsWrite: 'Manage Accounts',
      permStatsRead: 'Read Statistics'
    },

    // Audit Logs
    auditLogs: {
      title: 'Audit Logs',
      description: 'Track all administrative actions and system events for security and compliance.',
      exportLogs: 'Export Logs',
      clearLogs: 'Clear Logs',
      searchPlaceholder: 'Search logs by action, user, or message...',
      allActions: 'All Actions',
      allTime: 'All Time',
      today: 'Today',
      lastWeek: 'Last 7 Days',
      lastMonth: 'Last 30 Days',
      totalLogs: 'Total Logs',
      todayLogs: 'Today',
      lastAction: 'Last Action',
      system: 'System',
      target: 'Target',
      ipAddress: 'IP Address',
      userAgent: 'User Agent',
      changes: 'Changes',
      metadata: 'Metadata',
      noLogs: 'No audit logs found',
      previous: 'Previous',
      next: 'Next',
      pageInfo: 'Page {current} of {total}',
      collapse: 'Collapse',
      logsCleared: 'Audit logs cleared successfully',
      logsExported: 'Audit logs exported successfully',
      failedToClearLogs: 'Failed to clear logs',
      clearConfirmTitle: 'Clear Audit Logs',
      clearConfirmMessage: 'Are you sure you want to clear all audit logs? This action cannot be undone.',
      accountCreate: 'Account Created',
      accountUpdate: 'Account Updated',
      accountDelete: 'Account Deleted',
      apikeyCreate: 'API Key Created',
      apikeyUpdate: 'API Key Updated',
      apikeyDelete: 'API Key Deleted',
      settingsUpdate: 'Settings Updated',
      statsReset: 'Statistics Reset'
    },

    // Theme & Language
    theme: {
      light: 'Light Mode',
      dark: 'Dark Mode',
      toggle: 'Toggle Theme'
    },
    language: {
      en: 'English',
      zh: '中文',
      toggle: 'Switch Language'
    }
  },

  zh: {
    // 通用
    common: {
      confirm: '确认',
      cancel: '取消',
      close: '关闭',
      save: '保存',
      delete: '删除',
      edit: '编辑',
      add: '添加',
      refresh: '刷新',
      test: '测试',
      enable: '启用',
      disable: '禁用',
      import: '导入',
      export: '导出',
      loading: '加载中...',
      search: '搜索',
      filter: '筛选',
      sort: '排序',
      details: '详情',
      collapse: '收起',
      yes: '是',
      no: '否',
      none: '无',
      all: '全部',
      unknown: '未知'
    },

    // 登录
    login: {
      title: 'Kiro-Go',
      subtitle: '管理面板',
      password: '密码',
      passwordPlaceholder: '请输入管理员密码',
      loginButton: '登录',
      invalidPassword: '密码错误',
      logout: '退出登录'
    },

    // 导航
    nav: {
      accounts: '账户管理',
      apikeys: 'API 密钥',
      auditlogs: '操作日志',
      settings: '系统设置',
      stats: '统计信息'
    },

    // 账户面板
    accounts: {
      title: '账户',
      addAccount: '添加账户',
      importAccounts: '导入',
      exportAccounts: '导出',
      refreshAll: '全部刷新',
      searchPlaceholder: '按邮箱或昵称搜索...',

      // 统计
      total: '总计',
      enabled: '已启用',
      disabled: '已禁用',
      proPlus: 'Pro+',
      autoRefresh: '自动刷新 (30秒)',

      // 筛选
      allTypes: '全部类型',
      free: '免费版',
      pro: '专业版',
      proPlus: '专业增强版',
      power: '强力版',
      allStatus: '全部状态',
      sortByEmail: '按邮箱排序',
      sortByUsage: '按使用量排序',
      sortByType: '按类型排序',
      sortByStatus: '按状态排序',

      // 批量操作
      selected: '已选择',
      testSelected: '测试选中',
      enableSelected: '启用选中',
      disableSelected: '禁用选中',
      deleteSelected: '删除选中',
      clearSelection: '清除选择',

      // 账户卡片
      email: '邮箱',
      usage: '使用量',
      status: '状态',
      testing: '测试中...',

      // 模态框
      addAccountTitle: '添加账户',
      editAccountTitle: '编辑账户',
      importAccountsTitle: '导入账户',
      accountDetailsTitle: '账户详情',

      // 认证方式
      manualToken: '手动令牌',
      iamSSO: 'IAM SSO',
      builderID: 'Builder ID',
      ssoToken: 'SSO Token',
      credentialsJson: '凭证 JSON',

      // 表单字段
      accessToken: '访问令牌',
      refreshToken: '刷新令牌',
      region: '区域',
      nickname: '昵称',
      weight: '权重',
      allowOverage: '允许超额',
      overageWeight: '超额权重',
      overageEnabled: '超额计费',
      overageInformation: '超额信息',
      currentOverages: '当前超额',
      overageCap: '超额上限',
      overageCharges: '超额费用',
      overageRate: '超额费率',
      confirmEnableOverage: '启用超额计费？超出限额后将按使用量收费。',
      confirmDisableOverage: '禁用超额计费？达到限额后请求将被阻止。',
      overageToggleFailed: '切换超额状态失败',
      subscriptionInformation: '订阅信息',
      subscriptionTitle: '订阅标题',
      overageCapability: '超额能力',
      overageSupported: '支持超额',
      quotaUsage: '配额使用',
      resetDate: '重置日期',
      remaining: '剩余',
      overageControl: '超额控制',
      disableOverage: '禁用超额',
      enableOverage: '启用超额',
      overageDisabledWarning: '超额计费已禁用。配额耗尽后请求将被阻止。',
      overageActive: '超额已启用',
      overageUsage: '超额使用',
      loadBalancing: '负载均衡',
      userId: '用户ID',
      proxyURL: '代理地址',
      machineId: '机器ID',

      // Placeholders
      enterAccessToken: '输入访问令牌',
      enterRefreshToken: '输入刷新令牌',
      enterNickname: '输入昵称',
      enterEmail: '输入邮箱',
      enterNewAccessToken: '输入新的访问令牌（可选）',
      enterNewRefreshToken: '输入新的刷新令牌（可选）',
      enterMachineId: '机器ID',

      // 模态框标题和描述
      addAccountSubtitle: '选择认证方式添加新账户',
      authenticationMethod: '认证方式',
      manuallyEnterTokens: '手动输入访问令牌和刷新令牌',

      // 编辑账户
      editAccountTitle: '编辑账户',
      basicSettings: '基本设置',
      tokenSettings: '令牌设置',
      advancedSettings: '高级设置',
      weightLoadBalancing: '权重（负载均衡）',
      weightHelp: '权重越高 = 请求越多。默认：1',
      allowOverageUsage: '允许超额使用',
      allowOverageHelp: '即使超出配额也继续使用此账户',
      overageWeightLabel: '超额权重',
      overageWeightHelp: '超出配额时的权重。默认：1',
      proxyURLOptional: '代理地址（可选）',
      proxyURLHelp: '账户专用代理。留空则使用全局代理',
      machineIdLabel: '机器ID',
      machineIdHelp: '此账户的设备标识符',
      cancel: '取消',
      save: '保存',

      // IAM SSO 流程
      iamSsoDescription: '使用 AWS IAM Identity Center 登录（组织账户）',
      ssoTokenDescription: '使用来自 AWS CLI 或 SDK 的 SSO token 导入账户',
      credentialsDescription: '使用凭证 JSON 文件导入账户',
      startUrl: '起始 URL',
      startUrlPlaceholder: 'https://your-org.awsapps.com/start',
      startUrlHelp: '您的 AWS IAM Identity Center 起始 URL',
      starting: '启动中...',
      startSsoLogin: '开始 SSO 登录',
      ssoStep1Title: '步骤 1：在浏览器中授权',
      ssoStep1Description: '点击下方按钮在浏览器中打开授权页面：',
      openAuthPage: '打开授权页面',
      ssoStep2Title: '步骤 2：完成授权',
      ssoStep2Description: '授权完成后，从浏览器复制回调 URL 并粘贴到这里：',
      callbackUrl: '回调 URL',
      callbackUrlPlaceholder: '在此粘贴回调 URL',
      callbackUrlHelp: 'URL 应以 http://127.0.0.1:... 开头',
      completing: '完成中...',
      completeLogin: '完成登录',
      cancelSsoLogin: '取消 SSO 登录',

      // Builder ID 流程
      builderIdDescription: '使用 AWS Builder ID 登录（个人账户）',
      startBuilderIdLogin: '开始 Builder ID 登录',
      deviceAuthTitle: '设备授权',
      deviceAuthDescription: '在浏览器中访问以下 URL 并输入代码：',
      verificationUrl: '验证 URL',
      userCode: '用户代码',
      waitingForAuth: '等待授权中...',
      codeExpiresIn: '代码将在 {seconds} 秒后过期',
      cancelBuilderIdLogin: '取消 Builder ID 登录',

      // 导入模态框
      importMethod: '导入方式',
      ssoTokenTab: 'SSO Token',
      credentialsJsonTab: '凭证 JSON',
      ssoTokensLabel: 'SSO Token',
      ssoTokensPlaceholder: '在此粘贴 SSO token（每行一个）',
      ssoTokensHelp: '输入一个或多个 SSO token，每行一个',
      credentialsJsonLabel: '凭证 JSON',
      credentialsJsonPlaceholder: '在此粘贴凭证 JSON，例如：\n{\n  "accessToken": "...",\n  "refreshToken": "...",\n  "clientId": "...",\n  "clientSecret": "...",\n  "region": "us-east-1"\n}',
      credentialsJsonHelp: '粘贴完整的凭证 JSON 对象',
      importing: '导入中...',
      importResultsTitle: '导入结果',
      imported: '已导入',
      failed: '失败',

      // 区域选项
      regionUsEast1: '美国东部（弗吉尼亚北部）',
      regionUsWest2: '美国西部（俄勒冈）',
      regionEuWest1: '欧洲（爱尔兰）',
      regionApSoutheast1: '亚太地区（新加坡）',

      // 消息
      accountAdded: '账户添加成功',
      accountUpdated: '账户更新成功',
      accountDeleted: '账户删除成功',
      accountsRefreshed: '所有账户刷新成功',
      accountsExported: '账户导出成功',
      accountsImported: '个账户导入成功',
      testSuccessful: '测试成功！',
      testFailed: '测试失败',

      // 错误消息
      failedToAddAccount: '添加账户失败',
      failedToUpdateAccount: '更新账户失败',
      failedToDeleteAccount: '删除账户失败',
      failedToRefreshAccount: '刷新账户失败',
      failedToRefreshAccounts: '刷新账户失败',
      failedToUpdateAccountStatus: '更新账户状态失败',
      failedToExportAccounts: '导出账户失败',
      failedToImportSsoTokens: '导入 SSO token 失败',
      failedToImportCredentials: '导入凭证失败',
      failedToLoadAccountDetails: '加载账户详情失败',
      failedToRefreshModels: '刷新模型失败',

      // Toast 消息
      accountRefreshedSuccessfully: '账户刷新成功',
      accountsEnabledSuccessfully: '账户启用成功',
      accountsDisabledSuccessfully: '账户禁用成功',
      accountsDeletedSuccessfully: '账户删除成功',
      credentialsImportedSuccessfully: '凭证导入成功',
      modelsRefreshedSuccessfully: '模型刷新成功',
      copiedToClipboard: '已复制到剪贴板',
      failedToCopyToClipboard: '复制到剪贴板失败',

      // 批量操作
      batchTestFailed: '批量测试失败',
      allAccountsTestedSuccessfully: '所有 {count} 个账户测试成功',
      batchTestPartialSuccess: '{success} 个通过，{failed} 个失败',
      allAccountsFailed: '所有 {count} 个账户失败',
      batchTestComplete: '批量测试完成',

      // SSO/Builder ID
      ssoLoginStarted: 'SSO 登录已启动。请在浏览器中授权。',
      failedToStartSsoLogin: '启动 SSO 登录失败',
      failedToCompleteSsoLogin: '完成 SSO 登录失败',
      accountAddedViaSso: '通过 IAM SSO 添加账户成功',
      builderIdLoginStarted: 'Builder ID 登录已启动。请在浏览器中授权。',
      failedToStartBuilderIdLogin: '启动 Builder ID 登录失败',
      accountAddedViaBuilderID: '通过 Builder ID 添加账户成功',
      builderIdAuthExpired: 'Builder ID 授权已过期。请重试。',
      builderIdAuthDenied: 'Builder ID 授权被拒绝。',
      retryBuilderIdLogin: '重试 Builder ID 登录',

      // 验证消息
      pleaseEnterSsoToken: '请输入至少一个 SSO token',
      pleaseEnterCredentialsJson: '请输入凭证 JSON',
      invalidJsonFormat: 'JSON 格式无效',
      unknownError: '未知错误',
      importFailed: '导入失败',

      // 确认对话框
      deleteConfirmTitle: '删除账户',
      deleteConfirmMessage: '确定要删除此账户吗？此操作无法撤销。',
      batchDeleteConfirmTitle: '删除账户',
      batchDeleteConfirmMessage: '删除 {count} 个选中的账户？此操作无法撤销。',
      batchEnableConfirmTitle: '启用账户',
      batchEnableConfirmMessage: '启用 {count} 个选中的账户？',
      batchDisableConfirmTitle: '禁用账户',
      batchDisableConfirmMessage: '禁用 {count} 个选中的账户？',
      batchTestConfirmTitle: '测试账户',
      batchTestConfirmMessage: '测试 {count} 个选中的账户？这将向每个账户发送测试请求。',

      // 空状态
      noAccounts: '没有找到匹配的账户',
      noModels: '暂无模型。点击刷新加载模型列表。',

      // 详情
      basicInformation: '基本信息',
      usageInformation: '使用信息',
      statistics: '统计数据',
      advancedSettings: '高级设置',
      supportedModels: '支持的模型',
      refreshModels: '刷新模型',
      refreshingModels: '刷新中...',
      subscriptionType: '订阅类型',
      authMethod: '认证方式',
      currentUsage: '当前使用量',
      usageLimit: '使用限额',
      usagePercentage: '使用百分比',
      totalRequests: '总请求数',
      errorCount: '错误次数',
      totalTokens: '总Token数',
      lastUsed: '最后使用',
      never: '从未使用'
    },

    // 设置面板
    settings: {
      title: '设置',

      // 基础设置
      basicSettings: '基础设置',
      serverPort: '服务器端口',
      serverHost: '服务器地址',
      adminPassword: '管理员密码',
      adminPasswordPlaceholder: '输入新密码',
      apiKey: '全局访问密钥（可选）',
      apiKeyPlaceholder: '留空则禁用',
      apiKeyHelp: '为 /v1/messages 和 /v1/chat/completions 接口要求全局访问密钥',
      requireApiKey: '要求全局访问密钥',

      // 代理设置
      proxySettings: '代理设置',
      globalProxyURL: '全局代理地址',
      proxyURL: '代理地址',
      proxyURLPlaceholder: 'http://proxy:port 或 socks5://proxy:port',
      proxyURLHelp: '留空则禁用。格式：http://host:port 或 socks5://host:port',

      // Thinking 配置
      thinkingConfiguration: 'Thinking 配置',
      thinkingSuffix: 'Thinking 后缀',
      thinkingSuffixPlaceholder: '-thinking',
      thinkingSuffixHelp: '附加到模型名称以启用扩展思考（例如：claude-sonnet-4-thinking）',
      openaiFormat: 'OpenAI 格式',
      claudeFormat: 'Claude 格式',
      formatNone: '无',

      // 端点设置
      endpointSettings: 'Kiro 端点设置',
      preferredEndpoint: '首选端点',
      endpointAuto: '自动（尝试全部）',
      endpointKiro: 'Kiro IDE',
      endpointCodewhisperer: 'CodeWhisperer',
      endpointAmazonq: 'Amazon Q',
      enableFallback: '启用回退',
      enableFallbackHelp: '如果首选端点失败，尝试其他端点',

      // 提示词过滤
      promptFiltering: '提示词过滤',
      filterClaudeCode: '替换 Claude Code CLI 系统提示词',
      filterClaudeCodeHelp: '检测 Claude Code 内置系统提示词并用精简的后端提示词替换',
      filterEnvNoise: '移除环境元数据',
      filterEnvNoiseHelp: '从提示词中移除 git 状态、最近提交、环境部分',
      filterStripBoundaries: '移除提示词边界',
      filterStripBoundariesHelp: '移除 --- SYSTEM PROMPT --- 标记',

      // 自定义过滤规则
      customFilterRules: '自定义过滤规则',
      ruleType: '类型',
      ruleTypeRegex: '正则替换',
      ruleTypeLinesContaining: '移除包含的行',
      matchPattern: '匹配模式',
      matchPatternPlaceholder: '要匹配的模式',
      replaceWith: '替换为',
      replaceWithPlaceholder: '替换文本',
      removeRule: '移除',
      addRule: '+ 添加规则',

      // 操作
      saveSettings: '保存所有设置',
      saving: '保存中...',
      reset: '重置',
      settingsSaved: '设置保存成功',
      settingsFailed: '设置保存失败'
    },

    // 统计面板
    stats: {
      title: '统计',
      resetStats: '重置统计',
      resetConfirmTitle: '重置统计',
      resetConfirmMessage: '重置所有统计数据？此操作无法撤销，将清除所有历史数据。',
      statsReset: '统计数据重置成功',
      failedToResetStats: '重置统计数据失败',

      // 分组
      accountsSection: '账户',
      requestsSection: '请求',
      usageSection: '使用量',

      // 指标
      totalAccounts: '总账户数',
      available: '可用',
      unavailable: '不可用',
      totalRequests: '总请求数',
      successful: '成功',
      failed: '失败',
      successRate: '成功率',
      totalTokens: '总Token数',
      totalCredits: '总积分',
      uptime: '运行时间',

      // 图表
      successRateTrend: '成功率趋势',
      accountDistribution: '账户分布',
      last24Hours: '最近24小时',
      bySubscriptionType: '按订阅类型'
    },

    // API Keys
    apiKeys: {
      title: 'API 密钥',
      createKey: '创建 API 密钥',
      editKey: '编辑 API 密钥',
      description: '管理对话接口的 API 密钥：/v1/messages、/v1/chat/completions、/v1/messages/count_tokens',
      securityNote: '请妥善保管您的 API 密钥。不要在公共仓库或客户端代码中分享它们。',
      noKeys: '未找到 API 密钥。创建您的第一个密钥以开始使用。',
      createFirstKey: '创建第一个密钥',
      keyId: '密钥 ID',
      status: '状态',
      active: '活跃',
      inactive: '未激活',
      createdAt: '创建时间',
      lastUsed: '最后使用',
      expiresAt: '过期时间',
      usageCount: '使用次数',
      permissions: '权限',
      keyName: '密钥名称',
      keyNamePlaceholder: '例如：生产环境 API 密钥',
      keyNameHelp: '用于识别此密钥的描述性名称',
      neverExpires: '永不过期',
      expires7Days: '7 天',
      expires30Days: '30 天',
      expires90Days: '90 天',
      expires1Year: '1 年',
      permissionsHelp: '选择此密钥可以执行的操作',
      enableImmediately: '立即启用',
      keyCreated: 'API 密钥已创建',
      keyCreatedMessage: '您的 API 密钥已成功创建。请立即复制 - 您将无法再次看到它！',
      yourApiKey: '您的 API 密钥',
      copy: '复制',
      copied: '已复制！',
      copyWarning: '请务必立即复制您的 API 密钥。您将无法再次看到它！',
      keyUpdated: 'API 密钥更新成功',
      keyDeleted: 'API 密钥删除成功',
      keyEnabled: 'API 密钥已启用',
      keyDisabled: 'API 密钥已禁用',
      keyCopied: 'API 密钥已复制到剪贴板',
      saveFailed: '保存 API 密钥失败',
      failedToUpdateKeyStatus: '更新密钥状态失败',
      failedToDeleteKey: '删除密钥失败',
      deleteConfirmTitle: '删除 API 密钥',
      deleteConfirmMessage: '确定要删除此 API 密钥吗？此操作无法撤销，将立即撤销访问权限。',
      permMessagesRead: '读取消息',
      permMessagesWrite: '发送消息',
      permAccountsRead: '读取账户',
      permAccountsWrite: '管理账户',
      permStatsRead: '读取统计'
    },

    // 操作日志
    auditLogs: {
      title: '操作日志',
      description: '追踪所有管理操作和系统事件，用于安全和合规审计。',
      exportLogs: '导出日志',
      clearLogs: '清空日志',
      searchPlaceholder: '按操作、用户或消息搜索日志...',
      allActions: '全部操作',
      allTime: '全部时间',
      today: '今天',
      lastWeek: '最近7天',
      lastMonth: '最近30天',
      totalLogs: '总日志数',
      todayLogs: '今日',
      lastAction: '最后操作',
      system: '系统',
      target: '目标',
      ipAddress: 'IP 地址',
      userAgent: '用户代理',
      changes: '变更',
      metadata: '元数据',
      noLogs: '未找到操作日志',
      previous: '上一页',
      next: '下一页',
      pageInfo: '第 {current} 页，共 {total} 页',
      collapse: '收起',
      logsCleared: '操作日志已清空',
      logsExported: '操作日志已导出',
      failedToClearLogs: '清空日志失败',
      clearConfirmTitle: '清空操作日志',
      clearConfirmMessage: '确定要清空所有操作日志吗？此操作无法撤销。',
      accountCreate: '账户已创建',
      accountUpdate: '账户已更新',
      accountDelete: '账户已删除',
      apikeyCreate: 'API 密钥已创建',
      apikeyUpdate: 'API 密钥已更新',
      apikeyDelete: 'API 密钥已删除',
      settingsUpdate: '设置已更新',
      statsReset: '统计已重置'
    },

    // 主题和语言
    theme: {
      light: '浅色模式',
      dark: '深色模式',
      toggle: '切换主题'
    },
    language: {
      en: 'English',
      zh: '中文',
      toggle: '切换语言'
    }
  }
}

export function createI18n(locale = 'en') {
  let currentLocale = locale

  const t = (key, params = {}) => {
    const keys = key.split('.')
    let value = messages[currentLocale]

    for (const k of keys) {
      value = value?.[k]
    }

    if (typeof value === 'string') {
      // Replace {param} with actual values
      return value.replace(/\{(\w+)\}/g, (match, param) => {
        return params[param] !== undefined ? params[param] : match
      })
    }

    return key
  }

  const setLocale = (locale) => {
    if (messages[locale]) {
      currentLocale = locale
    }
  }

  const getLocale = () => currentLocale

  return { t, setLocale, getLocale }
}
