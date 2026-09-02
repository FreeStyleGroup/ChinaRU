plugins {
    /* Плагина kotlin-android здесь нет намеренно: начиная с AGP 9
       поддержка Kotlin встроена в сам плагин Android, и подключение
       org.jetbrains.kotlin.android приводит к отказу сборки. */
    alias(libs.plugins.android.application) apply false
    alias(libs.plugins.kotlin.compose) apply false
}
