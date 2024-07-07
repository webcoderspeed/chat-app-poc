import { useState, useRef, useEffect, useCallback } from 'react';

type Callback<T> = (state: T) => void;
type SetStateWithCallback<T> = (
	newState: T | ((prevState: T) => T),
	cb?: Callback<T>,
) => void;

export const useStateWithCallback = <T>(
	initialState: T,
): [T, SetStateWithCallback<T>] => {
	const [state, setState] = useState<T>(initialState);
	const cbRef = useRef<Callback<T> | null>(null);

	const updateState = useCallback(
		(newState: T | ((prevState: T) => T), cb?: Callback<T>) => {
			cbRef.current = cb || null;

			setState((prevState) =>
				typeof newState === 'function'
					? (newState as (prevState: T) => T)(prevState)
					: newState,
			);
		},
		[],
	);

	useEffect(() => {
		if (cbRef.current) {
			cbRef.current(state);
			cbRef.current = null;
		}
	}, [state]);

	return [state, updateState];
};
