/**
 * Error thrown when a redirect loop is detected.
 */
export class RedirectLoopError extends Error {}

type RedirectCode = 301 | 302 | 307 | 308;

/**
 * A resolved redirect with its target URL and status code.
 */
export interface Redirect {
	url: string;
	code: RedirectCode;
}

/**
 * A redirect rule with source path, target path, and optional status code.
 */
export interface RedirectDefinition {
	from: string;
	to: string;
	code?: RedirectCode;
}

/**
 * Check if a path is an absolute URL (starts with 'http').
 */
function isAbsolute(path: string): boolean {
	return path.startsWith('http');
}

/**
 * Extract the protocol and host from a URL path.
 * @returns Empty string for relative paths, 'protocol//host' for absolute URLs
 */
function getPathPrefix(path: string): string {
	if (!isAbsolute(path)) return '';

	const url = new URL(path);
	return url.protocol + '//' + url.host;
}

/**
 * Check if a path ends with a wildcard character.
 */
function containsWildcard(path: string): boolean {
	return path.endsWith('*');
}

/**
 * Check if a path contains a match group pattern like [name].
 */
function containsMatchGroup(path: string): boolean {
	return path.includes('[');
}

/**
 * Extract all match groups from a path.
 * @returns Array of match group patterns like ['[name]', '[id]']
 */
function getMatchGroups(path: string): string[] {
	return path.match(/\[(.*?)\]/g) || [];
}

/**
 * Remove the trailing slash from a path if present.
 */
function trimTrailingSlash(path: string): string {
	return path.replace(/\/$/, '');
}

/**
 * Determine the appropriate redirect target for a given path.
 */
class RedirectRule {
	prefix: string = '';

	from: string;
	to: string;
	code: RedirectCode;

	regex: RegExp | null = null;
	substitution: string = '';

	constructor(from: string, to: string, code: RedirectCode = 301) {
		this.prefix = getPathPrefix(from);

		this.from = from.slice(this.prefix.length);
		this.to = to;
		this.code = code;

		if (containsWildcard(from) || containsMatchGroup(from)) {
			this.buildRegex();
		}
	}

	/**
	 * Create a new RedirectRule from a RedirectDefinition.
	 */
	static from(definition: RedirectDefinition): RedirectRule {
		return new RedirectRule(definition.from, definition.to, definition.code);
	}

	/**
	 * Build the regex pattern and substitution string for the RedirectRule.
	 */
	buildRegex(): void {
		let regex = this.from.replace(/[/.]/g, '\\$&');
		if (regex.endsWith('\\/')) regex = regex + '?';

		let substition = this.to;
		let matchGroups = getMatchGroups(this.from);

		for (let matchGroup of matchGroups) {
			let name = matchGroup.slice(1, -1);
			regex = regex.replace(matchGroup, `(?<${name}>[^/]+)`);
			substition = substition.replace(matchGroup, `$<${name}>`);
		}

		if (regex.endsWith('\\/*')) {
			// Make the slash before the wildcard optional
			regex = regex.replace('\\/*', '(?<wildcard>\\/?.*)');
			substition = substition.replace('/*', '$<wildcard>');
		} else if (regex.endsWith('*')) {
			regex = regex.replace('*', '(?<wildcard>.*)');
			substition = substition.replace('*', '$<wildcard>');
		}

		this.regex = new RegExp(`^${regex}$`);
		this.substitution = substition;
	}

	/**
	 * Apply the redirect rule to a given path.
	 * If the rule does not match the path, the original path is returned.
	 */
	process(path: string): string {
		return this.regex ? this.processRegex(path) : this.processSimple(path);
	}

	/**
	 * Apply a simple redirect rule (no wildcards or match groups) to a given path.
	 */
	processSimple(path: string): string {
		if (trimTrailingSlash(path) !== trimTrailingSlash(this.from)) return path;

		return this.prefix + this.to;
	}

	/**
	 * Apply a complex redirect rule (with wildcards or match groups) to a given path.
	 */
	processRegex(path: string): string {
		let trimmed = trimTrailingSlash(path);

		if (!this.regex!.test(trimmed)) return path;

		// We only trim the trailing slash if necessary to support wildcards
		if (!this.regex!.test(path)) {
			return this.prefix + trimmed.replace(this.regex!, this.substitution);
		}

		return this.prefix + path.replace(this.regex!, this.substitution);
	}
}

/**
 * Determine the redirect target for a given URL based on the provided redirect rules.
 *
 * @param url - The URL to check for redirects
 * @param redirects - Array of redirect definitions
 * @returns Redirect object with target URL and status code, or null if no redirect
 * @throws RedirectLoopError if redirect chain exceeds maximum length
 */
export function getRedirect(url: URL, redirects: Array<RedirectDefinition>): Redirect | null {
	const prefix = url.protocol + '//' + url.host;
	const path = url.pathname;
	const query = url.search;

	let result = path;
	let code: RedirectCode | null = null;
	let maxRounds = 10;

	let rules = redirects.map((redirect) => RedirectRule.from(redirect));

	for (let i = 0; i <= maxRounds; i++) {
		let hasChanged = false;

		for (let rule of rules) {
			let newResult = rule.process(result);

			if (newResult === result) continue;

			// Return early if redirected to an external website
			if (isAbsolute(newResult))
				return {
					url: newResult + query,
					code: rule.code,
				};

			result = newResult;
			code = rule.code;
			hasChanged = true;
		}

		if (!hasChanged) break;

		if (i === maxRounds) throw new RedirectLoopError();
	}

	if (result === path) return null;

	return {
		url: prefix + result + query,
		code: code!,
	};
}
