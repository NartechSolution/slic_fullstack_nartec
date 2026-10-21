import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  IconButton,
  Tab,
  Tabs,
  Tooltip,
  Typography,
} from "@mui/material";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import DataObjectRoundedIcon from "@mui/icons-material/DataObjectRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { useTranslation } from "react-i18next";
import {
  dismissApiError,
  getApiErrorQueue,
  subscribeApiErrors,
  toSupportJson,
} from "../../utils/apiErrorHandler";

const SERVICE_STYLES = {
  erp: { bg: "#FEF3C7", fg: "#92400E" },
  backend: { bg: "#E0E7FF", fg: "#3730A3" },
  network: { bg: "#F3E8FF", fg: "#6B21A8" },
  app: { bg: "#E2E8F0", fg: "#334155" },
};

const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace";

const JSON_TOKEN =
  /("(?:\\u[a-fA-F0-9]{4}|\\[^u]|[^\\"])*"(?:\s*:)?|\b(?:true|false|null)\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g;

// Colours JSON tokens with React spans (no innerHTML, so API content can't inject markup)
const highlightJson = (json) => {
  const parts = [];
  let last = 0;
  let key = 0;
  let match;
  JSON_TOKEN.lastIndex = 0;
  while ((match = JSON_TOKEN.exec(json)) !== null) {
    const token = match[0];
    if (match.index > last) parts.push(json.slice(last, match.index));
    let color = "#FBBF24";
    if (token.startsWith('"')) color = /:\s*$/.test(token) ? "#93C5FD" : "#86EFAC";
    else if (token === "true" || token === "false") color = "#F9A8D4";
    else if (token === "null") color = "#94A3B8";
    parts.push(
      <span key={key++} style={{ color }}>
        {token}
      </span>
    );
    last = match.index + token.length;
  }
  if (last < json.length) parts.push(json.slice(last));
  return parts;
};

const copyToClipboard = async (text, container) => {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to the legacy path
  }
  try {
    // Append inside the dialog so MUI's focus trap doesn't steal the selection
    const host = container || document.body;
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.top = "-1000px";
    textarea.style.opacity = "0";
    host.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand("copy");
    host.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
};

const formatTime = (iso) => {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
};

const detailRow = (label, content, mono = false) => (
  <Box
    key={label}
    sx={{
      display: "grid",
      gridTemplateColumns: { xs: "1fr", sm: "130px 1fr" },
      gap: { xs: 0.25, sm: 2 },
      py: 1,
      borderBottom: "1px solid #F1F5F9",
      "&:last-of-type": { borderBottom: "none" },
    }}
  >
    <Typography sx={{ fontSize: 12.5, color: "#64748B", fontWeight: 600 }}>{label}</Typography>
    <Typography
      component="div"
      dir={mono ? "ltr" : undefined}
      sx={{
        fontSize: 13,
        color: "#0F172A",
        wordBreak: "break-word",
        fontFamily: mono ? MONO : undefined,
      }}
    >
      {content}
    </Typography>
  </Box>
);

const ApiErrorDialog = () => {
  const { t, i18n } = useTranslation();
  // Titles contain ":" and ".", so turn off i18next key separators
  const tx = (text) => t(text, { nsSeparator: false, keySeparator: false });
  const queue = useSyncExternalStore(subscribeApiErrors, getApiErrorQueue, getApiErrorQueue);
  const report = queue[0] || null;
  const [tab, setTab] = useState(0);
  const [copied, setCopied] = useState(null);
  const [copyFailed, setCopyFailed] = useState(false);
  const containerRef = useRef(null);
  const jsonRef = useRef(null);

  useEffect(() => {
    setTab(0);
    setCopied(null);
    setCopyFailed(false);
  }, [report?.id]);

  useEffect(() => {
    if (!copied) return undefined;
    const timer = setTimeout(() => setCopied(null), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  const json = useMemo(() => (report ? toSupportJson(report) : ""), [report]);
  const highlighted = useMemo(() => highlightJson(json), [json]);

  if (!report) return null;

  const service = report.service || { key: "app", label: "POS Application" };
  const serviceStyle = SERVICE_STYLES[service.key] || SERVICE_STYLES.app;
  const reference =
    report.request?.body?.APICODE || report.request?.body?.keyword || report.request?.body?._keyword_;
  const messageLabel = report.response
    ? `${tx("Response from")} ${tx(service.label)}`
    : service.key === "network"
    ? tx("What happened")
    : tx("Error");

  // A 2xx status means the call went through but the data was wrong – don't paint it red
  const statusOk = /^2/.test(report.status || "");

  const handleClose = () => dismissApiError();

  const handleCopy = async (text, which) => {
    const ok = await copyToClipboard(text, containerRef.current);
    if (ok) {
      setCopied(which);
      setCopyFailed(false);
    } else {
      // Let the user copy manually: show the JSON and select it
      setCopyFailed(true);
      setTab(1);
      setTimeout(() => {
        if (!jsonRef.current) return;
        const range = document.createRange();
        range.selectNodeContents(jsonRef.current);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
      }, 50);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `slic-pos-error-${report.occurredAt.replace(/[:.]/g, "-")}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <Dialog
      open
      onClose={(event, reason) => {
        if (reason !== "backdropClick") handleClose();
      }}
      maxWidth="md"
      fullWidth
      scroll="paper"
      aria-labelledby="api-error-dialog-title"
      sx={{ zIndex: 2000 }}
      slotProps={{
        paper: {
          dir: i18n.language === "ar" ? "rtl" : "ltr",
          sx: { borderRadius: 3, overflow: "hidden", m: { xs: 1.5, sm: 4 } },
        },
      }}
    >
      {/* Header + tabs stay fixed; only DialogContent scrolls on short screens */}
      <Box ref={containerRef} sx={{ display: "flex", flexDirection: "column", flexShrink: 0 }}>
        {/* Header */}
        <Box
          sx={{
            display: "flex",
            alignItems: "flex-start",
            gap: 2,
            px: { xs: 2, sm: 3 },
            pt: 2.5,
            pb: 2,
            background: "linear-gradient(180deg, #FEF2F2 0%, #FFFFFF 100%)",
          }}
        >
          <Box
            sx={{
              flexShrink: 0,
              width: 44,
              height: 44,
              borderRadius: "50%",
              bgcolor: "#FEE2E2",
              color: "#DC2626",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ErrorOutlineRoundedIcon />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              id="api-error-dialog-title"
              sx={{ fontSize: 18, fontWeight: 700, color: "#0F172A", lineHeight: 1.35 }}
            >
              {tx(report.title)}
            </Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1, mt: 1 }}>
              <Chip
                size="small"
                label={tx(service.label)}
                sx={{ bgcolor: serviceStyle.bg, color: serviceStyle.fg, fontWeight: 600 }}
              />
              {report.status && (
                <Chip
                  size="small"
                  label={`HTTP ${report.status}`}
                  sx={{
                    bgcolor: statusOk ? "#F1F5F9" : "#FEE2E2",
                    color: statusOk ? "#334155" : "#991B1B",
                    fontWeight: 600,
                    fontFamily: MONO,
                  }}
                />
              )}
              <Typography sx={{ fontSize: 12, color: "#64748B" }}>
                {formatTime(report.occurredAt)}
              </Typography>
            </Box>
          </Box>
          <IconButton onClick={handleClose} aria-label={tx("Close")} size="small" sx={{ mt: -0.5 }}>
            <CloseRoundedIcon />
          </IconButton>
        </Box>

        <Tabs
          value={tab}
          onChange={(event, value) => setTab(value)}
          sx={{
            px: { xs: 1, sm: 2 },
            minHeight: 40,
            borderBottom: "1px solid #E2E8F0",
            "& .MuiTab-root": { minHeight: 40, textTransform: "none", fontWeight: 600, fontSize: 13.5 },
          }}
        >
          <Tab label={tx("Error")} />
          <Tab
            icon={<DataObjectRoundedIcon sx={{ fontSize: 18 }} />}
            iconPosition="start"
            label={tx("Technical details (JSON)")}
          />
        </Tabs>
      </Box>

      <DialogContent sx={{ px: { xs: 2, sm: 3 }, py: 2.5, bgcolor: tab === 1 ? "#F8FAFC" : "#FFFFFF" }}>
        {tab === 0 && (
          <Box>
            <Typography
              sx={{
                fontSize: 11.5,
                fontWeight: 700,
                letterSpacing: 0.6,
                textTransform: "uppercase",
                color: "#64748B",
                mb: 1,
              }}
            >
              {messageLabel}
            </Typography>
            <Box
              sx={{
                position: "relative",
                bgcolor: "#FEF2F2",
                border: "1px solid #FECACA",
                borderInlineStart: "4px solid #DC2626",
                borderRadius: 2,
                p: 2,
                pr: 6,
              }}
            >
              <Typography
                component="div"
                dir="auto"
                sx={{
                  fontSize: 15,
                  color: "#7F1D1D",
                  fontWeight: 500,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  maxHeight: 240,
                  overflow: "auto",
                  userSelect: "text",
                }}
              >
                {report.message}
              </Typography>
              <Tooltip title={copied === "message" ? tx("Copied!") : tx("Copy message")}>
                <IconButton
                  size="small"
                  onClick={() => handleCopy(report.message, "message")}
                  aria-label={tx("Copy message")}
                  sx={{ position: "absolute", top: 8, insetInlineEnd: 8, color: "#B91C1C" }}
                >
                  {copied === "message" ? (
                    <CheckRoundedIcon fontSize="small" />
                  ) : (
                    <ContentCopyRoundedIcon fontSize="small" />
                  )}
                </IconButton>
              </Tooltip>
            </Box>

            {report.error?.message && report.error.message !== report.message && (
              <Typography sx={{ fontSize: 12.5, color: "#475569", mt: 1.25 }}>
                <strong>{tx("Details")}:</strong>{" "}
                {report.error.code ? `[${report.error.code}] ` : ""}
                {report.error.message}
              </Typography>
            )}

            <Box sx={{ mt: 2.5, border: "1px solid #E2E8F0", borderRadius: 2, px: 2, py: 0.5 }}>
              {report.request &&
                detailRow(
                  tx("API endpoint"),
                  <>
                    <Box component="span" sx={{ fontWeight: 700, color: "#1D4ED8", mr: 1 }}>
                      {report.request.method}
                    </Box>
                    {report.request.url}
                  </>,
                  true
                )}
              {reference && detailRow(tx("API code"), reference, true)}
              {detailRow(
                tx("Status"),
                report.status ? `HTTP ${report.status}` : tx("No response received"),
                !!report.status
              )}
              {detailRow(
                tx("Source"),
                <>
                  {tx(service.label)}
                  {service.note && (
                    <Typography component="div" sx={{ fontSize: 12, color: "#64748B", mt: 0.25 }}>
                      {service.note}
                    </Typography>
                  )}
                </>
              )}
              {report.request?.durationMs != null &&
                detailRow(tx("Duration"), `${report.request.durationMs} ms`)}
              {detailRow(tx("Time"), formatTime(report.occurredAt))}
            </Box>

            {report.lastApiCall && (
              <Typography sx={{ fontSize: 12.5, color: "#475569", mt: 1.5 }} dir="ltr">
                <strong>{tx("Last API call before this error")}:</strong>{" "}
                <Box component="span" sx={{ fontFamily: MONO }}>
                  {report.lastApiCall.method} {report.lastApiCall.url}
                  {report.lastApiCall.response ? ` → ${report.lastApiCall.response.status}` : ""}
                </Box>
              </Typography>
            )}

            <Box
              sx={{
                mt: 2.5,
                display: "flex",
                gap: 1.25,
                alignItems: "flex-start",
                bgcolor: "#F0F9FF",
                border: "1px solid #BAE6FD",
                borderRadius: 2,
                p: 1.5,
              }}
            >
              <InfoOutlinedIcon sx={{ color: "#0369A1", fontSize: 20, mt: "1px" }} />
              <Typography sx={{ fontSize: 13, color: "#0C4A6E" }}>
                {tx(
                  "If this keeps happening, click “Copy JSON” and share it with the support / development team. It contains the API called, headers, request and the full response."
                )}
              </Typography>
            </Box>
          </Box>
        )}

        {tab === 1 && (
          <Box>
            <Typography sx={{ fontSize: 12.5, color: "#475569", mb: 1.25 }}>
              {tx("Share this JSON with the development team. Tokens and secret keys are masked.")}
            </Typography>
            {copyFailed && (
              <Typography sx={{ fontSize: 12.5, color: "#B91C1C", mb: 1.25 }}>
                {tx("Automatic copy is blocked by the browser. The JSON is selected — press Ctrl+C to copy it.")}
              </Typography>
            )}
            <Box
              component="pre"
              ref={jsonRef}
              dir="ltr"
              sx={{
                m: 0,
                p: 2,
                bgcolor: "#0F172A",
                color: "#E2E8F0",
                borderRadius: 2,
                fontFamily: MONO,
                fontSize: 12.5,
                lineHeight: 1.6,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                maxHeight: "50vh",
                overflow: "auto",
                textAlign: "left",
                userSelect: "text",
              }}
            >
              {highlighted}
            </Box>
          </Box>
        )}
      </DialogContent>

      <DialogActions
        sx={{
          px: { xs: 2, sm: 3 },
          py: 1.5,
          gap: 1,
          flexWrap: "wrap",
          borderTop: "1px solid #E2E8F0",
        }}
      >
        {queue.length > 1 && (
          <Typography sx={{ fontSize: 12.5, color: "#64748B", mr: "auto" }}>
            {`1 / ${queue.length} ${tx("errors")}`}
          </Typography>
        )}
        <Button
          onClick={handleDownload}
          startIcon={<FileDownloadOutlinedIcon />}
          sx={{ textTransform: "none", fontWeight: 600, color: "#334155" }}
        >
          {tx("Download")}
        </Button>
        <Button
          variant="outlined"
          onClick={() => handleCopy(json, "json")}
          startIcon={copied === "json" ? <CheckRoundedIcon /> : <ContentCopyRoundedIcon />}
          color={copied === "json" ? "success" : "primary"}
          sx={{ textTransform: "none", fontWeight: 600 }}
        >
          {copied === "json" ? tx("Copied!") : tx("Copy JSON")}
        </Button>
        <Button
          variant="contained"
          onClick={handleClose}
          disableElevation
          sx={{ textTransform: "none", fontWeight: 600, bgcolor: "#DC2626", "&:hover": { bgcolor: "#B91C1C" } }}
        >
          {queue.length > 1 ? tx("Next error") : tx("Close")}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ApiErrorDialog;
