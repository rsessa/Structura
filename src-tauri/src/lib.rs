use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_shell::init())
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }

      let args: Vec<String> = std::env::args().collect();
      let enclave_mode = args.contains(&"--enclave-mode".to_string());

      if enclave_mode {
          // Auto-Tiling Mode: Right half of the screen split horizontally
          if let Some(monitor) = app.get_webview_window("editor").and_then(|w| w.current_monitor().ok().flatten()) {
              let screen_size = monitor.size();
              let screen_pos = monitor.position();
              
              let half_width = screen_size.width / 2;
              let half_height = screen_size.height / 2;
              
              if let Some(viewer_window) = app.get_webview_window("viewer") {
                  let viewer_x = screen_pos.x + (half_width as i32);
                  let viewer_y = screen_pos.y;
                  let _ = viewer_window.set_size(tauri::PhysicalSize::new(half_width, half_height));
                  let _ = viewer_window.set_position(tauri::PhysicalPosition::new(viewer_x, viewer_y));
              }
              
              if let Some(editor_window) = app.get_webview_window("editor") {
                  let editor_x = screen_pos.x + (half_width as i32);
                  let editor_y = screen_pos.y + (half_height as i32);
                  let _ = viewer_window.set_position(tauri::PhysicalPosition::new(screen_pos.x + half_width as i32, screen_pos.y));
              }
              
              if let Some(editor_window) = app.get_webview_window("editor") {
                  let _ = editor_window.set_size(tauri::PhysicalSize::new(half_width, half_height));
                  let _ = editor_window.set_position(tauri::PhysicalPosition::new(screen_pos.x + half_width as i32, screen_pos.y + half_height as i32));
              }
          } else {
              // Posicionamiento de Ventanas Lado a Lado
              let center_x = screen_pos.x + (screen_size.width as i32 / 2);
              
              if let Some(editor_window) = app.get_webview_window("editor") {
                  if let Ok(editor_size) = editor_window.outer_size() {
                      let editor_x = center_x - (editor_size.width as i32);
                      let editor_y = screen_pos.y + (screen_size.height as i32 / 2) - (editor_size.height as i32 / 2);
                      let _ = editor_window.set_position(tauri::PhysicalPosition::new(editor_x, editor_y));
                  }
              }
              
              if let Some(viewer_window) = app.get_webview_window("viewer") {
                   if let Ok(viewer_size) = viewer_window.outer_size() {
                      let viewer_x = center_x;
                      let viewer_y = screen_pos.y + (screen_size.height as i32 / 2) - (viewer_size.height as i32 / 2);
                      let _ = viewer_window.set_position(tauri::PhysicalPosition::new(viewer_x, viewer_y));
                  }
              }
          }
      }

      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
