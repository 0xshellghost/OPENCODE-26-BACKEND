export function commentBuilder(githubId, comment) {
    return comment.replace(/@(\w+)/, `@${githubId}`);
}

// For Opencode
// export var NOT_ASSIGNED_PR_ERROR = `Hey @githubId \n\nThis pull request is not linked to open for all or competitive issues. Either check the PR number or get yourself assigned to work on this issue. \n\nThanks for contributing in OpenCode\'23 ✨✨!`
// export var NOT_REGISTERED_ASSIGNED_ERROR = `Hey @githubId \n\nSince you have not registered, you can't work on this issue. If you have already registered on devfolio & joined discord server after registering on https://events.geekhaven.in, then contact organisers.\n\nThanks for your interest in OpenCode\'23 ✨✨!`;
// export var PR_OPENED_UNREGISTERED_ERROR = `Hey @githubId \n\nThanks for opening this PR 🚀. You have not registered on devfolio. If you have already registered, then contact organisers.\n\nThanks for contributing in OpenCode\'23 ✨✨!`;
// export var INVALID_ISSUE_NUMBER_ERROR = `Hey @githubId \n\nThis is not a valid Issue Number. Kindly recheck it!`;
// export var CLOSED_ISSUE_PR_ERROR = `Hey @githubId \n\nYou can't make a PR on closed issue. Try out our open issues in OpenCode\'23!`;
// export var PR_OPEN_SUCCESS = `Hey @githubId \n\nThanks for opening this PR 🚀. Mentor will review your pull request soon and till then, keep contributing and stay calm.\n\nThanks for contributing in OpenCode'23 ✨✨!`;
// export var NOT_ASSIGNED_TO_YOU_PR_ERROR = `Hey @githubId \n\nYou can't make a PR on an issue which is not open for all & assigned to someone else. Kindly check out some other issues or wait till it get assigned to you!. Happy contributing in OpenCode\'23 ✨✨!`;
// export var TEMPLATE_NOT_FOLLOWED_ERROR = `Hey @githubId \n\nPR Template is not followed. Kindly follow the template & edit it again for consideration as a valid pull request.\n\nThanks for contributing in OpenCode\'23 ✨✨!`;
// PR_MERGED's comment is in githubBot.controller.js as it required two parameters and I wasn't in a mood to process it like above oves with a new function.

//GeekCamp
export var NOT_ASSIGNED_PR_ERROR = `Hey @githubId \n\nThis pull request is not linked to open for all or competitive issues. Either check the PR number or get yourself assigned to work on this issue. \n\nThanks for participating in GeekCamp ✨✨!`
export var NOT_REGISTERED_ASSIGNED_ERROR = `Hey @githubId \n\nSince you have not registered, you can't work on this issue. If you have already registered on devfolio & joined discord server after registering on https://events.geekhaven.in, then please contact organisers.\n\nThanks for your interest in GeekCamp ✨✨!`;
export var PR_OPENED_UNREGISTERED_ERROR = `Hey @githubId \n\nThanks for opening this PR 🚀. You have not registered on devfolio. If you have already registered on https://events.geekhaven.in, then please contact organisers.\n\nThanks for participating in GeekCamp ✨✨!`;
export var INVALID_ISSUE_NUMBER_ERROR = `Hey @githubId \n\nThis is not a valid Issue Number. Kindly recheck it!`;
export var CLOSED_ISSUE_PR_ERROR = `Hey @githubId \n\nYou can't make a PR on closed issue. Try out our open issues in GeekCamp ✨✨!`;
export var PR_OPEN_SUCCESS = `Hey @githubId \n\nThanks for opening this PR 🚀. Mentor will review your pull request soon and till then, keep participating and stay calm.\n\nThanks for participating in GeekCamp ✨✨!`;
export var NOT_ASSIGNED_TO_YOU_PR_ERROR = `Hey @githubId \n\nYou can't make a PR on an issue which is not open for all & assigned to someone else. Kindly check out some other issues or wait till it get assigned to you!. Happy participating in GeekCamp ✨✨!`;
export var TEMPLATE_NOT_FOLLOWED_ERROR = `Hey @githubId \n\nPR Template is not followed. Kindly follow the template & edit it again for consideration as a valid pull request.\n\nThanks for participating in GeekCamp ✨✨!`;