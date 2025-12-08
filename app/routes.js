import {flatRoutes} from '@react-router/fs-routes';
import {layout} from '@react-router/dev/routes';
import {hydrogenRoutes} from '@shopify/hydrogen';

export default hydrogenRoutes([layout('./layout.jsx', await flatRoutes())]);

/** @typedef {import('@react-router/dev/routes').RouteConfig} RouteConfig */
