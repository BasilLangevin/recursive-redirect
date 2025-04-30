import { describe, it, expect } from 'vitest';
import { getRedirect, RedirectDefinition, RedirectLoopError } from './index';

type BasicRedirectDefinitions = Record<string, string>;

/**
 * Get the redirect target for a given path and set of redirect definitions.
 */
function testRedirect(path: string, redirects: Array<RedirectDefinition> | BasicRedirectDefinitions) {
	const host = 'http://example.com';

	const result = testAbsoluteRedirect(host + path, redirects);

	return result ? result.url.slice(host.length) : null;
}

/**
 * Get the redirect code for a given path and set of redirect definitions.
 */
function testRedirectCode(path: string, redirects: Array<RedirectDefinition>) {
	const host = 'http://example.com';

	const result = testAbsoluteRedirect(host + path, redirects);

	return result ? result.code : null;
}

/**
 * Return the result of getRedirect for the given URL and set of redirect definitions.
 */
function testAbsoluteRedirect(url: string, redirects: Array<RedirectDefinition> | BasicRedirectDefinitions | null) {
	if (redirects && !Array.isArray(redirects) && typeof redirects === 'object') {
		redirects = makeRedirects(redirects as BasicRedirectDefinitions);
	}

	return getRedirect(new URL(url), redirects as Array<RedirectDefinition>);
}

/**
 * Create an array of RedirectDefinition objects from set of basic redirect definitions.
 */
function makeRedirects(redirects: BasicRedirectDefinitions): Array<RedirectDefinition> {
	return Object.entries(redirects).map(([from, to]) => ({ from, to, code: 301 } as RedirectDefinition));
}

describe('getRedirect responses', () => {
	it('returns null when no redirect matches', () => {
		expect(testAbsoluteRedirect('http://example.com/no-match', { '/old': '/new' })).toBe(null);
	});

	it('returns the Redirect interface when a simple redirect matches', () => {
		expect(testAbsoluteRedirect('http://example.com/old', { '/old': '/new' })).toHaveProperty('url');
		expect(testAbsoluteRedirect('http://example.com/old', { '/old': '/new' })).toHaveProperty('code');
		expect(testAbsoluteRedirect('http://example.com/old', { '/old': '/new' })).toEqual({
			url: 'http://example.com/new',
			code: 301,
		});
	});
});

describe('simple redirects', () => {
	it('returns null when no redirect matches', () => {
		expect(testRedirect('/no-match', { '/old': '/new' })).toBe(null);
	});

	it('returns null when a redirect only partially matches', () => {
		expect(testRedirect('/old/123', { '/old': '/new' })).toBe(null);
	});

	it('returns the redirect when a simple redirect matches', () => {
		expect(testRedirect('/old', { '/old': '/new' })).toBe('/new');
	});

	it('returns the redirect when a simple redirect matches with differing trailing slashes', () => {
		expect(testRedirect('/old', { '/old/': '/new/' })).toBe('/new/');
		expect(testRedirect('/old/', { '/old': '/new/' })).toBe('/new/');
	});

	it('returns the redirect when a redirect to a different website matches', () => {
		expect(testAbsoluteRedirect('http://oldsite.com/old', { '/old': 'https://newsite.com/new' })?.url).toBe('https://newsite.com/new');
	});
});

describe('match group redirects', () => {
	it('returns the redirect when a match group redirect matches', () => {
		expect(testRedirect('/old/123', { '/old/[id]': '/new/[id]' })).toBe('/new/123');
	});

	it('returns null when a match group redirect only partially matches', () => {
		expect(testRedirect('/old/123/456', { '/old/[id]': '/new' })).toBe(null);
	});

	it('returns the redirect when a match group redirect matches when the match group is only defined in from', () => {
		expect(testRedirect('/old/123', { '/old/[id]': '/new' })).toBe('/new');
	});

	it('returns the redirect when a match group redirect matches with differing trailing slashes', () => {
		expect(testRedirect('/old/123', { '/old/[id]/': '/new/' })).toBe('/new/');
		expect(testRedirect('/old/123/', { '/old/[id]': '/new/' })).toBe('/new/');
	});

	it('returns the redirect when a match group that is part of a path segment matches', () => {
		expect(testRedirect('/old/123.html', { '/old/[file].html': '/new/[file].html' })).toBe('/new/123.html');
	});

	it('returns the redirect when multiple match groups that are part of a path segment match', () => {
		expect(testRedirect('/old/post-123', { '/old/[name]-[id]': '/new/[name]' })).toBe('/new/post');
	});

	it('returns the redirect when multiple match groups redirect', () => {
		expect(testRedirect('/old/i/n', { '/old/[id]/[name]': '/new/[name]/[id]' })).toBe('/new/n/i');
	});

	it('returns the redirect when multiple match groups redirect when the match groups are only defined in from', () => {
		expect(testRedirect('/old/i/n', { '/old/[id]/[name]': '/new' })).toBe('/new');
	});

	it('handles match groups with special characters', () => {
		expect(testRedirect('/old/hello%20world', { '/old/[text]': '/new/[text]' })).toBe('/new/hello%20world');
	});

	it('returns the redirect when a match group redirect to a different website matches', () => {
		expect(testAbsoluteRedirect('http://oldsite.com/old/abc', { '/old/[id]': 'https://newsite.com/new/[id]' })?.url).toBe(
			'https://newsite.com/new/abc'
		);
	});
});

describe('wildcard redirects', () => {
	it('returns the redirect when a wildcard preceded by a slash redirect matches', () => {
		expect(testRedirect('/old/', { '/old/*': '/new/*' })).toBe('/new/');
		expect(testRedirect('/old/123', { '/old/*': '/new/*' })).toBe('/new/123');
		expect(testRedirect('/old/123/456', { '/old/*': '/new/*' })).toBe('/new/123/456');
	});

	it('returns the redirect when a wildcard preceded by a slash redirect matches when the wildcard is only defined in from', () => {
		expect(testRedirect('/old/123', { '/old/*': '/new' })).toBe('/new');
		expect(testRedirect('/old/123/456', { '/old/*': '/new' })).toBe('/new');
	});

	it('returns the redirect when a wildcard not preceded by a slash redirect matches', () => {
		expect(testRedirect('/old', { '/old*': '/new*' })).toBe('/new');
		expect(testRedirect('/old123', { '/old*': '/new*' })).toBe('/new123');
		expect(testRedirect('/old/123', { '/old*': '/new*' })).toBe('/new/123');
		expect(testRedirect('/old123/456', { '/old*': '/new*' })).toBe('/new123/456');
		expect(testRedirect('/old/123/456', { '/old*': '/new*' })).toBe('/new/123/456');
	});

	it('returns the redirect when a wildcard not preceded by a slash redirect matches when the wildcard is only defined in from', () => {
		expect(testRedirect('/old/123', { '/old*': '/new' })).toBe('/new');
		expect(testRedirect('/old/123/456', { '/old*': '/new' })).toBe('/new');
	});

	it('returns the redirect when a wildcard redirect to a different website matches', () => {
		expect(testAbsoluteRedirect('http://oldsite.com/old/abc', { '/old/*': 'https://newsite.com/new/*' })?.url).toBe(
			'https://newsite.com/new/abc'
		);
	});
});

describe('combind match group and wildcard redirects', () => {
	it('returns the redirect when multiple match groups and a wildcard match', () => {
		expect(testRedirect('/old/i/n', { '/old/[id]/*': '/new/[id]/*' })).toBe('/new/i/n');
		expect(testRedirect('/old/i/n/123', { '/old/[id]/*': '/new/[id]/*' })).toBe('/new/i/n/123');
	});
});

describe('recursive redirects', () => {
	it('returns the redirect when recursive redirects match', () => {
		expect(
			testRedirect('/old', {
				'/old': '/middle',
				'/middle': '/new',
			})
		).toBe('/new');
	});

	it('returns the redirect when recursive redirects match in non-descending order', () => {
		expect(
			testRedirect('/old', {
				'/middle': '/new',
				'/old': '/middle',
			})
		).toBe('/new');
	});

	it('returns the redirect when recursive match group redirects match', () => {
		expect(
			testRedirect('/old/123', {
				'/old/[id]': '/middle/[id]',
				'/middle/[id]': '/new/[id]',
			})
		).toBe('/new/123');
	});

	it('throws an error when a redirect loop is detected', () => {
		expect(() => testRedirect('/old', { '/old': '/middle', '/middle': '/old' })).toThrow(RedirectLoopError);
	});

	it('iterates up to 10 times', () => {
		expect(
			testRedirect('/0', {
				'/9': '/10',
				'/8': '/9',
				'/7': '/8',
				'/6': '/7',
				'/5': '/6',
				'/4': '/5',
				'/3': '/4',
				'/2': '/3',
				'/1': '/2',
				'/0': '/1',
			})
		).toBe('/10');
	});

	it('does not iterate 11 times', () => {
		expect(() =>
			testRedirect('/0', {
				'/10': '/11',
				'/9': '/10',
				'/8': '/9',
				'/7': '/8',
				'/6': '/7',
				'/5': '/6',
				'/4': '/5',
				'/3': '/4',
				'/2': '/3',
				'/1': '/2',
				'/0': '/1',
			})
		).toThrow(RedirectLoopError);
	});
});

describe('query string redirects', () => {
	it('includes the query string in simple redirects', () => {
		expect(testRedirect('/old?test=123', { '/old': '/new' })).toBe('/new?test=123');
	});

	it('includes the query string in match group redirects', () => {
		expect(testRedirect('/old/123?test=123', { '/old/[id]': '/new/[id]' })).toBe('/new/123?test=123');
	});

	it('includes the query string in wildcard redirects', () => {
		expect(testRedirect('/old/123?test=123', { '/old*': '/new*' })).toBe('/new/123?test=123');
	});

	it('preserves multiple query parameters', () => {
		expect(testRedirect('/old?a=1&b=2&c=3', { '/old': '/new' })).toBe('/new?a=1&b=2&c=3');
	});

	it('preserves query parameters with special characters', () => {
		expect(testRedirect('/old?q=hello%20world&tag=%23special', { '/old': '/new' })).toBe('/new?q=hello%20world&tag=%23special');
	});

	it('preserves empty query parameters', () => {
		expect(testRedirect('/old?empty=&also=', { '/old': '/new' })).toBe('/new?empty=&also=');
	});
});

describe('redirect codes', () => {
	it('returns the redirect code when a redirect matches', () => {
		expect(testRedirectCode('/old', [{ from: '/old', to: '/new', code: 301 }])).toBe(301);
		expect(testRedirectCode('/old', [{ from: '/old', to: '/new', code: 302 }])).toBe(302);
	});

	it('returns the default redirect code when no redirect code is provided', () => {
		expect(testRedirectCode('/old', [{ from: '/old', to: '/new' }])).toBe(301);
	});

	it('returns the redirect code when a match group redirect matches', () => {
		expect(testRedirectCode('/old/123', [{ from: '/old/[id]', to: '/new/[id]', code: 302 }])).toBe(302);
	});

	it('returns the redirect code when a wildcard redirect matches', () => {
		expect(testRedirectCode('/old/123', [{ from: '/old*', to: '/new*', code: 302 }])).toBe(302);
	});
});
