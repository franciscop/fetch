declare module "swear" {
	/**
	 * Swear wraps an async function with extra methods and returns a callable proxy
	 * @param fn - The async function to wrap
	 * @param extraMethods - Additional methods to add to the returned proxy
	 * @returns A callable proxy with the extra methods attached
	 */
	export default function swear<T, M extends Record<string, any>>(
		fn: (...args: any[]) => Promise<T>,
		extraMethods?: M,
	): ((...args: any[]) => Promise<T>) & M;
}
