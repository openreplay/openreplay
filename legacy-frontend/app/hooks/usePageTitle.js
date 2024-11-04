import { useEffect } from 'react';

export default function usePageTitle(title) {
	return useEffect(() => {
		document.title = title;
	}, [])
}