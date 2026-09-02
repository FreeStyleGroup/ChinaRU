package com.chinaru.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import com.chinaru.ui.screens.MainScreen
import com.chinaru.ui.theme.ChinaRuTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        /* enableEdgeToEdge вызывается до setContent: начиная с Android 15
           система рисует под системными панелями всегда, и приложение,
           не объявившее этого, получает содержимое под вырезом. */
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)

        setContent {
            ChinaRuTheme {
                Surface(modifier = Modifier.fillMaxSize()) {
                    MainScreen()
                }
            }
        }
    }
}
