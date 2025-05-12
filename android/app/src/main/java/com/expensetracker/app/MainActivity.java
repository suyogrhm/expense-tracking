package com.expensetracker.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Bridge;
import android.webkit.WebView;
import android.webkit.WebSettings;
import android.webkit.ValueCallback;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Enable web view debugging
        WebView.setWebContentsDebuggingEnabled(true);
        
        // Configure WebView for responsive design
        WebView webView = getBridge().getWebView();
        WebSettings settings = webView.getSettings();
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setJavaScriptEnabled(true);
    }

    @Override
    public void onBackPressed() {
        Bridge bridge = this.getBridge();
        WebView webView = bridge.getWebView();
        
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            // If we can't go back in web history, check if we're on the home/dashboard page
            bridge.eval("window.location.pathname", new ValueCallback<String>() {
                @Override
                public void onReceiveValue(String path) {
                    if (path != null && !path.contains("/dashboard")) {
                        // If not on dashboard, navigate to it
                        bridge.eval(
                            "window.history.pushState({}, '', '/dashboard'); window.dispatchEvent(new PopStateEvent('popstate'));",
                            new ValueCallback<String>() {
                                @Override
                                public void onReceiveValue(String value) {
                                    // Navigation completed
                                }
                            }
                        );
                    } else {
                        // If on dashboard, minimize app instead of closing
                        moveTaskToBack(true);
                    }
                }
            });
        }
    }
}
