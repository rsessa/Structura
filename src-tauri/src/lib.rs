#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_fs::init())
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }

      // Posicionamiento de Ventanas Lado a Lado
      if let Some(monitor) = app.get_webview_window("editor").and_then(|w| w.current_monitor().ok().flatten()) {
          let screen_size = monitor.size();
          let screen_pos = monitor.position();
          
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

      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
