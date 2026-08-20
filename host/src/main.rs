//! Standalone Windie Inspector host.
//!
//! This crate is an independent localhost process, separate from the Windie
//! runtime package. It serves the compiled Inspector UI and injects the API
//! endpoint configuration required by the browser client. The Windie CLI may
//! supervise the resulting executable, but this host does not own runtime
//! state, persistence, model context, tool execution, or permissions.

use std::net::SocketAddr;

use anyhow::{Context, Result};
use axum::extract::{Path, State};
use axum::http::{StatusCode, header};
use axum::response::{Html, IntoResponse, Response};
use axum::routing::{get, post};
use axum::{Router, serve};
use rust_embed::Embed;
use tokio::net::TcpListener;
use tokio::sync::watch;

const DEFAULT_INSPECTOR_ADDRESS: &str = "127.0.0.1:3000";

#[derive(Embed)]
#[folder = "../frontend/build"]
struct InspectorAssets;

/// Shared host state containing the explicit local shutdown request channel.
///
/// The Inspector is bound to loopback, so this route is a local lifecycle
/// control, not a browser-facing runtime API.
#[derive(Clone)]
struct InspectorState {
    shutdown: watch::Sender<bool>,
}

/// Starts the standalone Inspector HTTP server.
#[tokio::main]
async fn main() -> Result<()> {
    let address = std::env::var("WINDIE_INSPECTOR_ADDRESS")
        .ok()
        .filter(|value| !value.trim().is_empty())
        .or_else(|| {
            std::env::var("WINDIE_INSPECTOR_PORT")
                .ok()
                .filter(|value| !value.trim().is_empty())
                .map(|port| format!("127.0.0.1:{port}"))
        })
        .unwrap_or_else(|| DEFAULT_INSPECTOR_ADDRESS.to_string())
        .parse::<SocketAddr>()
        .context("invalid WINDIE_INSPECTOR_ADDRESS")?;
    let listener = TcpListener::bind(address)
        .await
        .with_context(|| format!("failed to bind Inspector at {address}"))?;
    let (shutdown_sender, shutdown_receiver) = watch::channel(false);

    println!("windie inspector listening on http://{address}");
    // Keep one sender in `main` for the lifetime of the server. The router
    // receives a clone for `/shutdown`; dropping request state must never be
    // interpreted as a shutdown request.
    serve(listener, router(shutdown_sender.clone()))
        .with_graceful_shutdown(shutdown_signal(shutdown_receiver))
        .await
        .context("Inspector server failed")
}

fn router(shutdown: watch::Sender<bool>) -> Router {
    Router::new()
        .route("/", get(index))
        .route("/static/{*path}", get(static_asset))
        .route("/asset-manifest.json", get(asset_manifest))
        .route("/favicon.ico", get(favicon))
        .route("/manifest.json", get(manifest))
        .route("/shutdown", post(request_shutdown))
        .with_state(InspectorState { shutdown })
}

async fn index() -> Response {
    serve_index()
}

async fn static_asset(Path(path): Path<String>) -> Response {
    serve_asset(&format!("static/{path}"))
}

async fn asset_manifest() -> Response {
    serve_asset("asset-manifest.json")
}

async fn favicon() -> Response {
    serve_asset("favicon.ico")
}

async fn manifest() -> Response {
    serve_asset("manifest.json")
}

/// Requests graceful Inspector shutdown after returning an acknowledgement to
/// the local lifecycle caller.
async fn request_shutdown(State(state): State<InspectorState>) -> StatusCode {
    let _ = state.shutdown.send(true);
    StatusCode::ACCEPTED
}

fn serve_index() -> Response {
    match InspectorAssets::get("index.html") {
        Some(content) => {
            let html = String::from_utf8_lossy(&content.data);
            let api_url = std::env::var("WINDIE_API_ADDRESS")
                .ok()
                .filter(|value| !value.trim().is_empty())
                .map(|address| format!("http://{address}"))
                .or_else(|| {
                    std::env::var("WINDIE_API_PORT")
                        .ok()
                        .filter(|value| !value.trim().is_empty())
                        .map(|port| format!("http://127.0.0.1:{port}"))
                })
                .unwrap_or_else(|| "http://127.0.0.1:8787".to_string());
            let config_script = format!(
                "<script>window.__WINDIE_API_URL__ = {};</script>",
                serde_json::to_string(&api_url).expect("API URL is serializable")
            );
            let html = html.replace("</head>", &format!("{config_script}</head>"));
            Html(html).into_response()
        }
        None => (
            StatusCode::SERVICE_UNAVAILABLE,
            "Inspector build is missing; run npm run build in frontend",
        )
            .into_response(),
    }
}

fn serve_asset(path: &str) -> Response {
    let normalized = path.trim_start_matches('/');
    match InspectorAssets::get(normalized) {
        Some(content) => {
            let mime = mime_guess::from_path(normalized).first_or_octet_stream();
            (
                [(header::CONTENT_TYPE, mime.as_ref())],
                content.data.into_owned(),
            )
                .into_response()
        }
        None => (StatusCode::NOT_FOUND, "not found").into_response(),
    }
}

async fn shutdown_signal(mut shutdown: watch::Receiver<bool>) {
    let ctrl_c = async {
        if let Err(error) = tokio::signal::ctrl_c().await {
            eprintln!("failed to install Inspector Ctrl-C handler: {error}");
        }
    };

    #[cfg(unix)]
    let terminate = async {
        match tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate()) {
            Ok(mut signal) => {
                signal.recv().await;
            }
            Err(error) => {
                eprintln!("failed to install Inspector terminate handler: {error}");
                std::future::pending::<()>().await;
            }
        }
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    let requested_shutdown = async move {
        if !*shutdown.borrow() {
            let _ = shutdown.changed().await;
        }
    };

    tokio::select! {
        _ = ctrl_c => {},
        _ = terminate => {},
        _ = requested_shutdown => {},
    }
}
