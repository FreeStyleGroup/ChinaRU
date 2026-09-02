package com.chinaru.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.chinaru.ui.theme.*

@Composable
fun ProfileScreen() {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(BackgroundGray)
    ) {
        ProfileHeader()
        QuickStatsRow()
        ProfileMenuList()
    }
}

@Composable
fun ProfileHeader() {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(PrimaryRed)
            .padding(start = 16.dp, end = 16.dp, top = 24.dp, bottom = 24.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        // Аватар пользователя
        Box(
            modifier = Modifier
                .size(72.dp)
                .clip(CircleShape)
                .background(SurfaceWhite),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = Icons.Default.Person,
                contentDescription = "Аватар",
                tint = PrimaryRed,
                modifier = Modifier.size(48.dp)
            )
        }
        
        Spacer(modifier = Modifier.width(16.dp))
        
        // Данные (Имя и телефон/email)
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = "Иван Петров",
                color = SurfaceWhite,
                fontSize = 22.sp,
                fontWeight = FontWeight.Bold
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = "+7 (999) 123-45-67",
                color = LightRed,
                fontSize = 14.sp
            )
        }
        
        // Кнопка настроек
        IconButton(onClick = { /* TODO: Переход в настройки профиля */ }) {
            Icon(
                imageVector = Icons.Default.Settings,
                contentDescription = "Настройки",
                tint = SurfaceWhite
            )
        }
    }
}

@Composable
fun QuickStatsRow() {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(SurfaceWhite)
            .padding(vertical = 16.dp),
        horizontalArrangement = Arrangement.SpaceEvenly
    ) {
        StatItem(value = "145 230 ₽", label = "Кошелёк")
        StatItem(value = "12", label = "Купоны")
        StatItem(value = "5", label = "Избранное")
    }
}

@Composable
fun StatItem(value: String, label: String) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(
            text = value,
            fontSize = 16.sp,
            fontWeight = FontWeight.Bold,
            color = TextMain
        )
        Spacer(modifier = Modifier.height(4.dp))
        Text(
            text = label,
            fontSize = 12.sp,
            color = TextSecondary
        )
    }
}

data class MenuItem(val title: String, val subtitle: String? = null, val icon: ImageVector)

@Composable
fun ProfileMenuList() {
    // Структура меню, аналогичная вашему массиву $menuItems из Битрикса
    val menuItems = listOf(
        MenuItem("Мои заказы", "Отслеживание, возвраты и споры", Icons.Default.List),
        MenuItem("Адрес доставки", "Управление адресами", Icons.Default.Place),
        MenuItem("Кошелёк и Финансы", "Цифровой рубль, юань, криптовалюта", Icons.Default.Star),
        MenuItem("Мой магазин", "Кабинет продавца (Seller)", Icons.Default.ShoppingCart),
        MenuItem("Сообщения", "Чаты с продавцами и поддержка", Icons.Default.Email),
        MenuItem("Мой гараж", "Управление автомобилями", Icons.Default.Build),
        MenuItem("Путешествия", "Авиабилеты, отели, туры", Icons.Default.Send)
    )

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        items(menuItems) { item ->
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { /* TODO: Переход в соответствующий раздел */ },
                colors = CardDefaults.cardColors(containerColor = SurfaceWhite),
                elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
                shape = RoundedCornerShape(12.dp)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = item.icon,
                        contentDescription = item.title,
                        tint = PrimaryRed,
                        modifier = Modifier.size(28.dp)
                    )
                    Spacer(modifier = Modifier.width(16.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = item.title,
                            fontSize = 16.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = TextMain
                        )
                        if (item.subtitle != null) {
                            Spacer(modifier = Modifier.height(2.dp))
                            Text(
                                text = item.subtitle,
                                fontSize = 12.sp,
                                color = TextSecondary
                            )
                        }
                    }
                }
            }
        }
    }
}