import { data } from 'react-router';

export async function loader() {
	return data({
		success: true,
		message: 'Client API test successful',
		timestamp: new Date().toISOString(),
	});
}
