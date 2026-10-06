import axios from "axios";

// Shared API error reporting for the POS screens.
// showApiError() turns an axios error / axios response / Error into a support report
// (endpoint, headers, payload, raw API response) and queues it for <ApiErrorDialog />,
// so cashiers see exactly what the API returned and can copy the JSON for the dev team.

const MAX_QUEUE = 10;
const MAX_BODY_CHARS = 100000;
const MAX_MESSAGE_CHARS = 4000;
const LAST_CALL_WINDOW_MS = 15000;

const SENSITIVE_KEY = /(authorization|secret|password|token|api[-_]?key)/i;

// Upstream SLIC ERP endpoints behind our backend proxy (backend/controllers/slicuat05api.js)
const ERP_UPSTREAM = {
  "/v1/postdata": "/oneerpreport/api/postdata",
  "/v1/getapi": "/oneerpreport/api/getapi",
  "/v1/sliclogin": "/oneerpauth/api/login",
};

let queue = [];
let lastExchange = null;
const listeners = new Set();

const emit = () => listeners.forEach((listener) => listener());

export const subscribeApiErrors = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const getApiErrorQueue = () => queue;

export const dismissApiError = () => {
  queue = queue.slice(1);
  emit();
};

// Records timing and the most recent request/response on an axios instance.
// Interceptors pass everything through untouched.
export const attachApiErrorTracking = (instance) => {
  instance.interceptors.request.use((config) => {
    config.metadata = { ...(config.metadata || {}), startedAt: Date.now() };
    return config;
  });
  instance.interceptors.response.use(
    (response) => {
      markDuration(response?.config);
      lastExchange = { response, at: Date.now() };
      return response;
    },
    (error) => {
      markDuration(error?.config);
      lastExchange = { error, at: Date.now() };
      return Promise.reject(error);
    }
  );
};

const markDuration = (config) => {
  if (config?.metadata?.startedAt) {
    config.metadata.durationMs = Date.now() - config.metadata.startedAt;
  }
};

const isAxiosResponse = (value) =>
  !!value &&
  typeof value === "object" &&
  !(value instanceof Error) &&
  "status" in value &&
  "data" in value &&
  "config" in value;

const maskValue = (value) => {
  const text = String(value);
  const bearer = text.match(/^(Bearer\s+)(.*)$/i);
  const prefix = bearer ? bearer[1] : "";
  const raw = bearer ? bearer[2] : text;
  if (raw.length <= 10) return `${prefix}***`;
  return `${prefix}${raw.slice(0, 6)}…${raw.slice(-4)} (masked)`;
};

const maskSensitive = (input, depth = 0) => {
  if (input == null || depth > 8) return input;
  if (Array.isArray(input)) return input.map((item) => maskSensitive(item, depth + 1));
  if (typeof input === "object") {
    return Object.fromEntries(
      Object.entries(input).map(([key, value]) => [
        key,
        SENSITIVE_KEY.test(key) && value != null && typeof value !== "object"
          ? maskValue(value)
          : maskSensitive(value, depth + 1),
      ])
    );
  }
  return input;
};

const truncateBody = (body) => {
  if (body == null) return body;
  const text = typeof body === "string" ? body : JSON.stringify(body);
  if (!text || text.length <= MAX_BODY_CHARS) return body;
  return `${text.slice(0, MAX_BODY_CHARS)}… [truncated, ${text.length} characters in total]`;
};

const looksLikeHtml = (text) =>
  /^\s*<(!doctype|html|head|body|\?xml)/i.test(text) || /<\/(html|body|div|p|h1|title)>/i.test(text);

const htmlToText = (text) =>
  text
    .replace(/<(style|script)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

const MESSAGE_KEYS = [
  "message",
  "Message",
  "error",
  "Error",
  "errorMessage",
  "ErrorMessage",
  "error_description",
  "msg",
  "detail",
  "details",
  "title",
];

// Pulls the human-readable message out of whatever the API sent back. Falls back to the
// raw body (pretty JSON) when the format is unknown, so nothing the API said is hidden.
export const extractApiMessage = (data, depth = 0) => {
  if (data == null || depth > 4) return "";
  if (typeof data === "string") {
    const text = looksLikeHtml(data) ? htmlToText(data) : data.trim();
    return text;
  }
  if (typeof data !== "object") return String(data);

  if (Array.isArray(data)) {
    if (data.length === 0) return "";
    if (data.every((item) => typeof item === "string")) return data.join("\n");
    return JSON.stringify(data, null, 2);
  }

  for (const key of MESSAGE_KEYS) {
    const value = data[key];
    if (value == null || value === "") continue;
    const text = extractApiMessage(value, depth + 1);
    if (text) return text;
  }

  if (Array.isArray(data.errors) && data.errors.length) {
    return data.errors
      .map((item) =>
        typeof item === "string" ? item : item?.msg || item?.message || JSON.stringify(item)
      )
      .join("\n");
  }

  return Object.keys(data).length ? JSON.stringify(data, null, 2) : "";
};

const plainHeaders = (headers) => {
  if (!headers) return {};
  const result = typeof headers.toJSON === "function" ? headers.toJSON() : { ...headers };
  ["common", "delete", "get", "head", "post", "put", "patch"].forEach((bucket) => {
    if (result[bucket] && typeof result[bucket] === "object") delete result[bucket];
  });
  return result;
};

const readRequestBody = (data) => {
  if (data == null || data === "") return null;
  if (typeof FormData !== "undefined" && data instanceof FormData) {
    const fields = {};
    data.forEach((value, key) => {
      fields[key] =
        typeof File !== "undefined" && value instanceof File
          ? `[File: ${value.name}, ${value.size} bytes, ${value.type || "unknown type"}]`
          : value;
    });
    return fields;
  }
  if (typeof data === "string") {
    try {
      return JSON.parse(data);
    } catch {
      return data;
    }
  }
  return data;
};

const buildUrl = (config) => {
  const url = config?.url || "";
  if (/^https?:\/\//i.test(url) || !config?.baseURL) return url;
  return `${config.baseURL.replace(/\/+$/, "")}/${url.replace(/^\/+/, "")}`;
};

const describeService = (url, body) => {
  const match = url.match(/\/slicuat05api(\/v1\/[^/?#]+)/i);
  if (match) {
    const upstream = body?.url || ERP_UPSTREAM[match[1].toLowerCase()] || "SLIC ERP";
    return {
      key: "erp",
      label: "SLIC ERP API",
      note: `Sent through the POS backend proxy to SLIC ERP (${upstream}).`,
    };
  }
  return { key: "backend", label: "SLIC POS Server API" };
};

const describeRequest = (config) => {
  const url = buildUrl(config);
  const body = readRequestBody(config.data);
  const request = {
    method: (config.method || "get").toUpperCase(),
    url,
  };
  if (config.params && Object.keys(config.params).length) request.params = maskSensitive(config.params);
  request.headers = maskSensitive(plainHeaders(config.headers));
  if (body != null) request.body = truncateBody(maskSensitive(body));
  if (config.metadata?.durationMs != null) request.durationMs = config.metadata.durationMs;
  return { request, service: describeService(url, body) };
};

const describeResponse = (response) => ({
  status: response.status,
  statusText: response.statusText || "",
  headers: plainHeaders(response.headers),
  body: truncateBody(maskSensitive(response.data)),
});

const describeNetworkError = (error) => {
  if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
    return "The request timed out before the server responded.";
  }
  if (error.code === "ERR_NETWORK" || error.message === "Network Error") {
    return "No response from the server. Check the internet connection — the server may be down or unreachable.";
  }
  if (error.code === "ERR_CANCELED") return "The request was cancelled.";
  return error.message || "The request failed before a response was received.";
};

const readContext = () => {
  const context = {};
  try {
    context.page = window.location.pathname;
    context.appUrl = window.location.origin;
  } catch {
    // ignore
  }
  try {
    const user = JSON.parse(sessionStorage.getItem("slicUserData"))?.data?.user;
    if (user?.UserLoginID) context.user = user.UserLoginID;
  } catch {
    // ignore
  }
  try {
    const location = JSON.parse(sessionStorage.getItem("selectedLocation"));
    if (location?.stockLocation) context.location = location.stockLocation;
  } catch {
    // ignore
  }
  return context;
};

const summarizeLastExchange = () => {
  if (!lastExchange || Date.now() - lastExchange.at > LAST_CALL_WINDOW_MS) return undefined;
  const response = lastExchange.response || lastExchange.error?.response;
  const config = response?.config || lastExchange.error?.config;
  if (!config) return undefined;
  const summary = { ...describeRequest(config).request };
  if (response) summary.response = describeResponse(response);
  else if (lastExchange.error) summary.error = lastExchange.error.message;
  return summary;
};

let reportCounter = 0;

/**
 * @param source  axios error, axios response (e.g. a 200 that is missing data), Error or string
 * @param options.title            what the user was doing, e.g. "Sales Invoice (INVOICE) failed"
 * @param options.fallbackMessage  shown only when the API itself gave no message
 * @param options.response         axios response to attach when `source` is a plain Error
 */
export const buildApiErrorReport = (source, options = {}) => {
  const { title, fallbackMessage, response: responseOverride } = options;
  const axiosError = axios.isAxiosError(source) ? source : null;
  const response =
    axiosError?.response || (isAxiosResponse(source) ? source : null) || responseOverride || null;
  const config = axiosError?.config || response?.config || null;
  const appError = !axiosError && source instanceof Error ? source : null;

  const described = config ? describeRequest(config) : null;
  const networkFailure = axiosError && !response;

  let service;
  if (networkFailure) {
    service = {
      key: "network",
      label: "Network / Server unreachable",
      note: described?.service?.note,
    };
  } else if (described) {
    service = described.service;
  } else {
    service = { key: "app", label: "POS Application" };
  }

  const apiMessage = response ? extractApiMessage(response.data) : "";
  let message = apiMessage;
  if (!message && networkFailure) message = describeNetworkError(axiosError);
  if (!message) message = fallbackMessage || "";
  if (!message && appError) message = appError.message;
  if (!message && response) message = "The API returned an empty response.";
  if (!message) message = typeof source === "string" ? source : "Unexpected error";
  if (message.length > MAX_MESSAGE_CHARS) {
    message = `${message.slice(0, MAX_MESSAGE_CHARS)}… (see Technical details for the full response)`;
  }

  const defaultTitle = {
    erp: "SLIC ERP API error",
    backend: "Server error",
    network: "Network error",
    app: "Something went wrong",
  }[service.key];

  const report = {
    id: `${Date.now()}-${++reportCounter}`,
    title: title || defaultTitle,
    message,
    occurredAt: new Date().toISOString(),
    service,
    status: response ? `${response.status}${response.statusText ? ` ${response.statusText}` : ""}` : null,
    request: described?.request || null,
    response: response ? describeResponse(response) : null,
    context: readContext(),
  };

  if (networkFailure) {
    report.error = { name: axiosError.name, code: axiosError.code, message: axiosError.message };
  } else if (appError) {
    report.error = { name: appError.name, message: appError.message };
    if (!config) report.lastApiCall = summarizeLastExchange();
  } else if (typeof source === "string" && source !== message) {
    report.error = { message: source };
  }

  return report;
};

// The JSON a cashier copies/downloads and sends to the development team.
export const toSupportJson = (report) =>
  JSON.stringify(
    {
      title: report.title,
      message: report.message,
      occurredAt: report.occurredAt,
      source: report.service?.label,
      sourceNote: report.service?.note,
      status: report.status || undefined,
      request: report.request || undefined,
      response: report.response || undefined,
      error: report.error,
      lastApiCall: report.lastApiCall,
      context: report.context,
    },
    null,
    2
  );

export const showApiError = (source, options = {}) => {
  let report;
  try {
    report = buildApiErrorReport(source, options);
  } catch (buildError) {
    // Never let error reporting break the caller's flow
    report = {
      id: `${Date.now()}-${++reportCounter}`,
      title: options.title || "Something went wrong",
      message: String(source?.message || source || options.fallbackMessage || "Unexpected error"),
      occurredAt: new Date().toISOString(),
      service: { key: "app", label: "POS Application" },
      status: null,
      request: null,
      response: null,
      context: readContext(),
      error: { message: buildError?.message },
    };
  }

  console.error(`[API Error] ${report.title}: ${report.message}`, report);

  // StrictMode double effects / repeated clicks shouldn't stack identical dialogs
  const duplicate = queue.some(
    (item) =>
      item.title === report.title &&
      item.message === report.message &&
      item.request?.url === report.request?.url
  );
  if (!duplicate) {
    queue = [...queue, report].slice(-MAX_QUEUE);
    emit();
  }
  return report;
};
